Lets create  a service that will use the SQLIte behind the scenes as the storage.


This service will provide an API that will mimic the Mongo DB API, with the following actions:

- find
- findOne
- insert
- update
- updateMany
- delete
- deleteMany
- findOneAndUpdate 

 The service will receive the path for the sqlite database and the schema for the database.
 For each table in the database the service will create a subtopic with its actions example:
 Schema contains 2 tables:
 users
 orders
 
 
 if the crud service path is "store" the following actions would be available:

 store/users/find
 store/users/findOne
 store/users/insert
 store/users/update
 store/users/updateMany
 store/users/delete
 store/users/deleteMany
 store/users/findOneAndUpdate

 store/orders/find
 store/orders/findOne
 store/orders/insert
 store/orders/update
 store/orders/updateMany
 store/orders/delete
 store/orders/deleteMany
 store/orders/findOneAndUpdate
 
 Ther service will receive paremers and return paremter using a custom struct that follows a specific trait. so the trait allows thage structs to be converted to a HashMap<String, ArcValue> and back and be builkd from one also.. so when can receive ArcValue<CustomStruct_For_The_Entity> and return ArcValue<CustomStruct_For_The_Entity> and internaly transform to HashMap<String, ArcValue> whyich is what we need internaly to apply our rules and do the SQL queries and then we do it  back to the struct and return.. sot he DEv ux is of usint their own CustomStruct_For_The_Entity and we do the internal conversion

  store/orders/find
  async fn find(&self, params: HashMap<String, ArcValue>) -> Result<Vec<ArcValue>> {
    
    
    Ok(list)
  }
  the step before this.. converts from the CustomStruct_For_The_Entity to HashMap<String, ArcValue> and calls the action
  the step after this.. converts from the HashMap<String, ArcValue> to CustomStruct_For_The_Entity