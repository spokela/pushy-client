/**
 * Pushy 
 * Publish/subscribe system for realtime webapps
 * 
 * @version 1.0
 */
var Pushy = (function () {
    var C = {}, Channel = {}, EventDispatcher = {}, arrayIndexOf = function(array, item) {
        var nativeIndexOf = Array.prototype.indexOf;
        if (array == null) return -1;
        if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
        for (i = 0, l = array.length; i < l; i++) if (array[i] === item) return i;
        return -1;
    };
    
    EventDispatcher = function() {
        this.callbacks = [];
    };
    
    EventDispatcher.prototype.bind = function(event, callback) {
        this.callbacks[event] = this.callbacks[event] || [];
        this.callbacks[event].push(callback);
        return this;
    };
    
    EventDispatcher.prototype.unbind = function(event, callback) {
        if(this.callbacks[event]) {
            var index = arrayIndexOf(this.callbacks[event], callback);
            this.callbacks[event].splice(index, 1);
        }
        return this;
    };
    
    EventDispatcher.prototype.emit = function(event, data) {
        var callbacks = this.callbacks[event];
        if (callbacks) {
            for (var i = 0; i < callbacks.length; i++) {
                callbacks[i](data);
            }
        } 
    };
    
    C = function(url, authHandler) {
        this.url = url;
        this.authHandler = (authHandler || "/pushy/auth");
        this.connecting = false;
        this.connected = false;
        this.evd = new EventDispatcher();
        this.socketId = null;
        this.protocol = undefined;
        this.channels = [];
    };
    
    C.prototype.bind = function (event, callback) {
        this.evd.bind(event, callback);
        return this;
    };
    
    C.prototype.unbind = function (event, callback) {
        this.evd.unbind(event, callback);
        return this;
    };
    
    C.prototype.exec = function(name, data) {
        if(!this.connected) {
            this.connect(function() {
                this.exec(name, data);
            }.bind(this));
            
            return;
        }
        
        this.handle.send(JSON.stringify({
           command: name,
           data: data || []
        }));
    };
    
    C.prototype.connect = function(callback) {
        if(this.connecting || this.connected) return this;
        this.connecting = true;
        var sock = this.handle = new SockJS(this.url);
        sock.onopen = function() {
            this.connecting = true;
        }.bind(this);
        
        sock.onmessage = function(e) {
            var msg = JSON.parse(e.data) || {};
            this.evd.emit('internal-msg', e.data);
            
            if(!msg.event) {
                return;
            }
            var event = msg.event;
            var data  = msg.data || {};
            var chan;
            if(event == "pushy:connect") {
                this.socketId = data.socketId;
                this.protocol = data.protocol;
                this.connected = true;
                this.evd.emit('connect', this);
                if(typeof callback == 'function') {
                    callback();
                }
            } else if(event == "pushy:subscription-success") {
                chan = this.channel(data.channel);
                chan.onSubscribed(data.memberId, data.presence);
            } else if(event == "pushy:subscription-end") {
                if(!this.channelExists(data.channel)) return;
                chan = this.channel(data.channel);
                chan.onUnsubscribed();
            } else if(event == "pushy:subscription-needauth") {
                if(!this.channelExists(data.channel)) return;
                chan = this.channel(data.channel);
                $.post(this.authHandler, {
                    channel: data.channel,
                    connection_id: this.socketId
                }, function (data, status) {
                    if(status == "success") {
                        chan.subscribe(data);
                    }
                }.bind(this), "json");
            } else if(event == "pushy:subscription-failed") {
                if(!this.channelExists(data.channel)) return;
                chan = this.channel(data.channel);
                chan.evd.emit('subscribe-error', data.reason);
            } else if(event == "pushy:presence-add") {
                if(!this.channelExists(msg.channel)) return;
                chan = this.channel(msg.channel);
                chan.evd.emit('pushy:member-added', data.member);
            } else if(event == "pushy:presence-quit") {
                if(!this.channelExists(msg.channel)) return;
                chan = this.channel(msg.channel);
                chan.evd.emit('pushy:member-quit', data.member);
            } else {
                if(msg.channel) {
                    if(!this.channelExists(msg.channel)) return;
                    chan = this.channel(msg.channel);
                    if(!chan.subscribed) return;
                    chan.evd.emit(event, data);
                }
            }
        }.bind(this);
        
        sock.onclose = function() {
            this.connecting = false;
            this.connected = false;
            this.handle = undefined;
            delete sock;
            this.evd.emit('disconnect', this);
            var ch;
            for(var name in this.channels) {
                ch = this.channels[name];
                ch.onUnsubscribed();
            }
        }.bind(this);
        
        return this;
    };
    
    C.prototype.channel = function(name) {
        if(this.channels[name]) {
            return this.channels[name];
        }
        
        var chan = new Channel(name, this);
        this.channels[name.toLowerCase()] = chan;
        
        return chan;
    };
    
    C.prototype.channelExists = function(name) {
        return this.channels[name.toLowerCase()] !== undefined;
    };
    
    Channel = function (name, handle) {
        this.name = name;
        this.handle = handle;
        this.subscribed = false;
        this.evd = new EventDispatcher();
        this.members = [];
        this.memberId = undefined;
    };
    
    Channel.prototype.requireAuth = function() {
        return this.name.toString().toLowerCase().indexOf('private-') === 0;
    };
    
    Channel.prototype.bind = function (event, callback) {
        this.evd.bind(event, callback);
        return this;
    };
    
    Channel.prototype.unbind = function (event, callback) {
        this.evd.unbind(event, callback);
        return this;
    };
    
    Channel.prototype.subscribe = function(subscriptionData) {
        if(this.subscribed) return this;
        var data = {channel: this.name};
        if(this.requireAuth()) {
            data.auth = ((subscriptionData && subscriptionData.auth) || "");
            if(subscriptionData && subscriptionData.data) {
                data.data = subscriptionData.data
            }
        }
        
        this.handle.exec('subscribe', data);
        return this;
    };
    
    Channel.prototype.unsubscribe = function() {
        if(!this.subscribed) return this;
        this.handle.exec('unsubscribe', {channel: this.name});
        return this;
    };
    
    Channel.prototype.onSubscribed = function(memberId, presenceData) {
        this.subscribed = true;
        this.memberId = memberId;
        this.evd.emit('subscribe', presenceData);
    };
    
    Channel.prototype.onUnsubscribed = function() {
        this.subscribed = false;
        this.evd.emit('unsubscribe');
    };
    
    return C;
}());