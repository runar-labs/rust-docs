use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn, Ident, parse::Parser, Meta, Type, TypePath, Path, PathSegment};
use proc_macro2::Span;

/// Action macro for defining service operations in Runar
///
/// This macro marks methods as service operations that can be invoked through the Node API.
/// It handles parameter extraction and result conversion.
///
/// # Parameters
/// - `name`: The operation name that will be used in node.request() calls (default: method name)
///
/// # Examples
/// ```rust
/// // Named action
/// #[action(name = "get_user")]
/// async fn get_user_by_id(&self, request: ServiceRequest) -> Result<ServiceResponse, anyhow::Error> {
///     // Implementation
///     Ok(ServiceResponse::success("User found", Some(user_data)))
/// }
///
/// // Default name from method
/// #[action]
/// async fn get_posts(&self, request: ServiceRequest) -> Result<ServiceResponse, anyhow::Error> {
///     // Implementation
///     Ok(ServiceResponse::success("Posts retrieved", Some(posts_data)))
/// }
/// ```
///
/// # Parameter Handling
/// The macro supports extracting parameters from the ServiceRequest:
/// - All actions can be called with: `node.request("service/action", params)`
/// - Parameters are accessed via `request.params`
///
/// # Return Values
/// - Action methods should return `Result<ServiceResponse, anyhow::Error>`
/// - Error handling is done via the `?` operator in the generated code
pub fn action(attr: TokenStream, item: TokenStream) -> TokenStream {
    // Parse the function definition
    let input_fn = parse_macro_input!(item as ItemFn);
    
    // Extract the method name which will be used as default operation name if none provided
    let method_name = &input_fn.sig.ident;
    let method_name_str = method_name.to_string();
    
    // Get the operation name from attributes or use method name
    let operation_name = if attr.is_empty() {
        method_name_str.clone()
    } else {
        // Parse the attribute tokens into a list of Meta items
        let parser = syn::punctuated::Punctuated::<Meta, syn::Token![,]>::parse_terminated;
        let meta_list = parser.parse(attr.clone().into()).unwrap_or_default();
        
        // Convert meta_list into a Vec<Meta>
        let meta_vec: Vec<Meta> = meta_list.into_iter().collect();
        
        // Extract name-value pairs
        let name_value_pairs = crate::utils::extract_name_value_pairs(&meta_vec);
        
        // Find the name attribute or default to method name
        name_value_pairs
            .get("name")
            .cloned()
            .unwrap_or_else(|| method_name_str.clone())
    };
    
    // Verify method is async
    if input_fn.sig.asyncness.is_none() {
        return syn::Error::new_spanned(
            input_fn.sig.fn_token,
            "action methods must be async"
        ).to_compile_error().into();
    }
    
    // Extract the receiver type (service type) from the first parameter
    let self_ty = match &input_fn.sig.inputs.first() {
        Some(syn::FnArg::Receiver(receiver)) => {
            // Use turbofish syntax with generics in the impl block
            quote! { Self }
        }
        _ => {
            // This is an error - action handlers must be methods
            return syn::Error::new_spanned(
                &input_fn.sig,
                "Action handlers must be methods with &self or &mut self parameter",
            )
            .to_compile_error()
            .into();
        }
    };
    
    // Analyze the return type to determine if it's already ServiceResponse or needs wrapping
    let returns_service_response = is_service_response_return(&input_fn.sig.output);
    let returns_result = is_result_return(&input_fn.sig.output);
    
    // Generate handler code based on return type
    let handler_code = if returns_service_response {
        // Direct pass-through for ServiceResponse returns
        quote! {
            // Call the method with appropriate parameters
            service.#method_name(context, params).await
                .context(format!("Error executing {}", #operation_name))
        }
    } else {
        // Wrap native returns in ServiceResponse::success
        quote! {
            // Call the method to get the native return value
            let result = service.#method_name(context, params).await
                .context(format!("Error executing {}", #operation_name))?;
                
            // Wrap the result in a ServiceResponse
            Ok(runar_node::ServiceResponse::success(
                "Operation succeeded", 
                Some(result.into()) // Convert to ValueType using Into trait
            ))
        }
    };
    
    // Generate the implementation
    let output = quote! {
        // Keep the original function
        #input_fn
        
        // Register the action handler in the registry
        inventory::submit! {
            crate::registry::ActionItem {
                name: #operation_name.to_string(),
                service_type_id: std::any::TypeId::of::<#self_ty>(),
                handler_fn: Box::new(move |service_ref, context, _operation, params| {
                    Box::pin(async move {
                        use anyhow::Context;
                        
                        // Downcast the service reference to our concrete type
                        let service = service_ref.downcast_ref::<#self_ty>()
                            .ok_or_else(|| anyhow::anyhow!("Service type mismatch in action handler"))?;
                        
                        // Call the method with appropriate parameters
                        // This calls the original method we defined
                        #handler_code
                    })
                }),
            }
        }
    };
    
    TokenStream::from(output)
}

/// Represents a parameter in a function signature
struct Parameter {
    name: String,
    ty: String,
    is_reference: bool,
}

/// Extracts parameters from a function signature
fn extract_parameters(inputs: &syn::punctuated::Punctuated<syn::FnArg, syn::token::Comma>) -> Vec<Parameter> {
    let mut parameters = Vec::new();
    
    for input in inputs {
        if let syn::FnArg::Typed(pat_type) = input {
            // Extract parameter name
            if let syn::Pat::Ident(ident) = &*pat_type.pat {
                let param_name = ident.ident.to_string();
                
                // Skip self parameter
                if param_name == "self" {
                    continue;
                }
                
                // Extract parameter type
                let type_str = quote! { #pat_type.ty }.to_string();
                
                // Check if it's a reference
                let is_reference = if let syn::Type::Reference(_) = &*pat_type.ty {
                    true
                } else {
                    false
                };
                
                parameters.push(Parameter {
                    name: param_name,
                    ty: type_str,
                    is_reference,
                });
            }
        }
    }
    
    parameters
}

/// Generates code to extract parameters from a request
fn generate_parameter_extraction(parameters: &[Parameter]) -> proc_macro2::TokenStream {
    let mut extraction_code = proc_macro2::TokenStream::new();
    
    for param in parameters {
        // Skip context parameter
        if param.name == "context" || param.name == "ctx" || param.name == "_context" || param.name == "_ctx" {
            continue;
        }
        
        // Generate parameter extraction based on type
        let param_name = Ident::new(&param.name, Span::call_site());
        let param_extraction = quote! {
            let #param_name = crate::utils::extract_parameter::<_, _>(
                &params, 
                #param_name,
                concat!("Missing required parameter: ", #param_name)
            )?;
        };
        
        extraction_code.extend(param_extraction);
    }
    
    extraction_code
}

/// Check if the return type is Result<ServiceResponse>
fn is_service_response_return(output: &syn::ReturnType) -> bool {
    match output {
        syn::ReturnType::Default => false,
        syn::ReturnType::Type(_, ty) => {
            // Check if it's a Result<ServiceResponse>
            match &**ty {
                Type::Path(TypePath { path, .. }) => {
                    // Check if the outer type is Result
                    if is_type_named(path, "Result") {
                        // Check if there are generic arguments
                        if let Some(PathSegment { arguments, .. }) = path.segments.last() {
                            // Check if the first type argument is ServiceResponse
                            if let syn::PathArguments::AngleBracketed(args) = arguments {
                                if let Some(syn::GenericArgument::Type(Type::Path(TypePath { path, .. }))) = args.args.first() {
                                    return is_type_named(path, "ServiceResponse");
                                }
                            }
                        }
                    }
                    false
                }
                _ => false,
            }
        }
    }
}

/// Check if the return type is a Result (any Result<T>)
fn is_result_return(output: &syn::ReturnType) -> bool {
    match output {
        syn::ReturnType::Default => false,
        syn::ReturnType::Type(_, ty) => {
            match &**ty {
                Type::Path(TypePath { path, .. }) => {
                    is_type_named(path, "Result")
                }
                _ => false,
            }
        }
    }
}

/// Check if a type is named a certain way
fn is_type_named(path: &syn::Path, name: &str) -> bool {
    path.segments.iter().any(|segment| {
        segment.ident == name
    })
} 