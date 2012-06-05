module.exports = function Server(expressInstance, sessionStore) {
	var parseCookie = require('connect').utils.parseCookie;
	var io = require('socket.io').listen(expressInstance);
    var asmsServer = expressInstance.asmsDB;
    var thisApp = expressInstance.thisApp;
    var thisInstance = expressInstance.thisInstance;

	io.configure(function () {
		io.set('log level', 0);
	});

	io.set('authorization', function(handshakeData, ack) {
		var cookies = parseCookie(handshakeData.headers.cookie);
		sessionStore.get(cookies[expressInstance.cookieName], function(err, sessionData) {
			handshakeData.session = sessionData || {};
			handshakeData.sid = cookies[expressInstance.cookieName]|| null;
			ack(err, err ? false : true);
		});
	});

	io.sockets.on('connection', function(client) {
		var user = client.handshake.session.user ? client.handshake.session.user.name : 'UID: '+(client.handshake.session.uid || 'has no UID');

        var desiredStream = "firehose";

        if (client.handshake.session && client.handshake.session.desiredStream) {
            desiredStream = client.handshake.session.desiredStream;
        }

		// Join user specific channel, this is good so content is send across user tabs.
		client.join(client.handshake.sid);


        var avatarUrl = (client.handshake.session.auth && client.handshake.session.user && client.handshake.session.user.image) ? client.handshake.session.user.image : '/img/codercat-sm.jpg';
        var currentUser = {displayName: user, image: {url: avatarUrl}};


        console.log("Subscribing " + user);

        asmsServer.subscribe(desiredStream,  function(channel, json) {
            client.send(json);
        });

        var cf_provider;
        var provider = new asmsServer.ActivityObject({'displayName': 'The Internet', icon: {url: ''}});
        if (client.handshake.session.auth) {
            if (client.handshake.session.auth.github) {
                provider.displayName = 'GitHub';
                provider.icon.url = 'http://github.com/favicon.ico';
            } else if (client.handshake.session.auth.facebook) {
                provider.displayName = 'Facebook';
                provider.icon = {url: 'http://facebook.com/favicon.ico'};
            } else if (client.handshake.session.auth.twitter) {
                provider.displayName = 'Twitter';
                provider.icon = {url: 'http://twitter.com/favicon.ico'};
            }
        }
        provider.save(function(err) {
            if (err == null) {
                var cf_provider = new asmsServer.ActivityObject({'displayName': 'Cloud Foundry', icon:{url: 'http://www.cloudfoundry.com/images/favicon.ico'}});
                   cf_provider.save(function(err) {
                       if (err == null) {
                           if (client.handshake.session && client.handshake.session.auth &&  client.handshake.session.user) {
                               var act = new asmsServer.Activity({
                                       id: 1,
                                       actor: currentUser,
                                       verb: 'connect',
                                       object: thisInstance,
                                       target: thisApp,
                                       title: "connected to",
                                       provider: provider,
                                       generator: cf_provider
                                   });
                               asmsServer.publish(desiredStream, act);
                           } else {
                               console.log("We don't have a user name so don't raise an activity");
                               console.dir(client.handshake.session.user);
                           }

                       } else {
                           console.log("Got error publishing welcome message")
                       }
                   });
            }
        });



		client.on('message', function(message) {
            var actHash = {
                actor: currentUser,
                verb: 'post',
                object: {objectType: "note", content: message, displayName: ""},
                target: thisApp,
                provider: provider,
                generator: cf_provider
            }

            if (actHash.verb == "post") {
                actHash.title = "posted a " + actHash.object.objectType;

            }

            var act = new asmsServer.Activity(actHash);
            // Send back the message to the users room.
            asmsServer.publish(desiredStream, act);
		});

		client.on('disconnect', function() {
				console.log('********* disconnect');
				asmsServer.unsubscribe(desiredStream);
				console.log("unsubscribed from firehose");

				if (client.handshake.session.user && client.handshake.session.user.name) {
						asmsServer.publish(desiredStream, new asmsServer.Activity({
								actor: currentUser,
								verb: 'disconnect',
								object: thisInstance,
								target: thisApp,
								title: "disconnected from",
								provider: provider,
								generator: cf_provider
						}));


				} else {
						console.log("User disconnected");
						console.dir(client.handshake);
				}
		});
	});

	io.sockets.on('error', function(){ console.log(arguments); });

	return io;
};
