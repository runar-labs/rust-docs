just like we did for the node ffi.. we also need to expose
our node and a few other features to a ios library in switft.. that
internaly uses the rust node.

we want to export the same node interface we have in node..
and for the services also same API, actoins events service metadaat etc.

this lib is to be used in iOS  projects.. is there is a way to make it generics c so we can used in macos apps and IOS apps great. otherwise just focus on iOS.

the iOS side will use its keyring to get  and store the user keys.. and will inject that into the node.. so we need an adpter for that.. that provides an interface for our node to store and retrieve keys .. and that in iOS is implement using the iOS keyring provided by the OS.

