


statless and sategfull services

- the fmk distinguishes from stateless and stateufll services
most service should be stateles where nothing is stored in the service instance.
- action handlers and event handlers just deslgt with the data rewceived as parameter or in the context and return its retuslta or can call other actions or emit evenbts...


then we have statefull services where the object is to store data and aloow to retrieval. e.g. Sqlite service or Mongo service

stateless services are availçanble for use as soon as it starts.. but statefull services might need to compelte data sync before is availçabe to answer requestsa and handle events..
IMPORTANT NOTE for eveng delivery.. only services that have STARTED can receive events.. and accept request

Statefull services will during start check full data sync and only when that is done complete the start me6thods and the core can set service state to started and then be afvialable for reqeusta dn process events.

Mixins

Mixins is the concept toi be able to mix multpel services,  adding up their actions and efvent hadlers.. 
the last action with same name wins.. meaning with u mix A and B
service = [A, B] ..and both A and B has the action login .. since B comes after. B.login wins and service will be a combination of all A action and B actoin with B.login the one used and A.login ignored.

same for event subscribers. the default behaviou is that when  same evnet subscriber exists, the last one wins by replaciunbg any previoous.. there is also an optoin to always preserve all suybscribers. so even when 2 or more services are listenignf to the same evnet.all subscribers are registers and theyb all receive qand process the event..


we nee dto explore different designs for this .. optoins I can see are:
A) MixInService type that takes name, path version and descriptiopn and takes a list of services that will used to mixion using the ruoles above.


Abstract Service
servies taht are not intended to be used directly..they dont have a path or name or versoni or description.. they hav everything else.

Sqlite is a abstract service, so ti needs to be wrapped in a MixInService service if u want just the Sqlite features or usualy combined with others fearteus like CRUD. e.g.

let node_config = NodeConfig::new("test");
let node = Node::new(node_config).await.unwrap();

//define user schema with entithy name, and list of field name and type.. 
//which the service uses to createa the SQL DB tables.
let user_schema = {
    users: {
        "name":"string",
        "email":"string", 
        "age":"integer",
    },
    profiles: {
        ... porofile table fields
    }
}

let pure_sql = MixInService::new("Users Sqlite Databse", "users_db", [SqliteService::new(user_schema)]);

let crud = MixInService::new("Users store", "users_store", [SqliteCrud::new(SqliteService::new(user_schema))]);

node.add_service(pure_sql).await
node.add_service(crud).await

//pure_sql API
node.request("users_db/execute/users", {statement:"INSERT INTO USERS VALUES ($name, $email, $age)",{name:"John", email: "john@email.com", age:45}})

node.request("users_db/query/users",{statement:"SELECT * FROM USERS WHERE (name like $name)",{name:"John"}})


//sqlite crud API
node.request("users_store/create/users", {name:"John", email: "john@email.com", age:45})

node.request("users_store/update/users", {query:{email:"john@email.com"}, update:{age:42}})

node.request("users_store/delete/users", {email:"john@email.com"}) 
node.request("users_store/delete/users", {id:12333}) 

let users = node.request("users_store/find/users", {name:{"$like":"john%"}}) 