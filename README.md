# Pushy Client

Pushy is a Publish/Subscribe system for realtime web applications. 
This is the client-side library to use in the browser and enjoy a real-time webapp.

## Dependencies

Prior loading ```pushy-client.js``` you have to load:

* SockJS: https://github.com/sockjs/sockjs-client
* jQuery|Zepto: http://jquery.com/ | http://zeptojs.com/

## Basic Usage

```javascript
var pushy = new Pushy("<pushy-server-url>:<port>", "<auth-handler-uri>");
var channel = pushy.channel("<channel-name>");

channel.bind('subscribe', function() {
    // do something on subscription
});

channel.bind('customEvent', function(data) {
    // this event is trigger server-side by your application
    // and will be propagated to all subscribers
});

channel.subscribe();
```

## Presence-enabled/private channels

