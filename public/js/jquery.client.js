// In case we leave a console.*** in the code without native support
(function(b){function c(){}for(var d="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info, log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),a;a=d.pop();)b[a]=b[a]||c;})(window.console=window.console||{});

(function ($) {

	// Shorthand jQuery selector cache. Only use on selectors for the DOM that won't change.
	var $$ = (function() {
		var cache = {};
		return function(selector) {
			if (!cache[selector]) {
				cache[selector] = $(selector);
			}
			return cache[selector];
		};
	})();

	var socketIoClient = io.connect(null, {
		'port': '#socketIoPort#'
		, 'rememberTransport': true
		, 'transports': ['xhr-polling']
	});
	socketIoClient.on('connect', function () {
		$$('#connected').addClass('on').find('strong').text('Online');
	});

	socketIoClient.on('message', function(json) {
    var doc = JSON.parse(json);
    if (doc) {
        var msg = doc.actor.displayName + " " + doc.title + " " + doc.object.displayName;
        if (doc.target) {
          msg+= " in " + doc.target.displayName;
        }
        if (doc.generator) {
          msg+= " via " + doc.generator.displayName;
        }

        if (doc.object && doc.object.content) {
            msg+= ": " + doc.object.content;
        }

        var $li = $('<li>').text(msg).append($('<img class="avatar">').attr('src', doc.actor.image.url));
        if (doc.provider && doc.provider.icon && doc.provider.icon.url) {
            $li.append($('<img class="service">').attr('src', doc.provider.icon.url));
        }
        $$('#stream ul').prepend($li);
        $$('#bubble').scrollTop(98).stop().animate({
        			'scrollTop': '0'
        		}, 5000);
        setTimeout(function() {
        			$li.remove();
        		}, 5000);

        if (doc.verb == "connect") {
            setTimeout(function() {
                socketIoClient.send('Ok great news !');
            }, 1000);
        } else {
            setTimeout(function() {
                socketIoClient.send('I am still here');
            }, 10000);
        }
    }
	});

	socketIoClient.on('disconnect', function() {
		$$('#connected').removeClass('on').find('strong').text('Offline');
	});
})(jQuery);
