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

```javascript
var channel = pushy.channel("private-securechan");

channel.bind('subscribe', function(members) {
    // members = list of current channel subscribers (presence data)
});

channel.bind('pushy:member-added', function(presenceData) {
    // someone joined the channel
});

channel.bind('pushy:member-quit', function(presenceData) {
    // someone left the channel
});

channel.subscribe(); // will do POST ajax request to your auth-handler 
```

## LICENSE

This software is licensed under the MIT License. Please refer to the LICENSE file for more details.

```
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```