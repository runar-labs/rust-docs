## Mixins Concept

Mixins allow combining multiple services, adding up their actions and event handlers. The rules for combining services are:

- For actions with the same name, the last one wins. For example, if you mix services A and B, and both have an action called "login", B's login action will be used and A's will be ignored.

- For event subscribers, the default behavior is that when the same event subscriber exists, the last one wins by replacing any previous ones. There is also an option to preserve all subscribers, so even when multiple services are listening to the same event, all subscribers are registered and they all receive and process the event.

3. **MixIn Service**: A service that combines multiple services into one, following the mixin rules.