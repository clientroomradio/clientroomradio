function ChatController($scope, $element, $compile, socket) {
	var $chatContent= $('.chat-content', $element);
	var $input= $('.chat-input', $element);

	var $newTrackChatLineTemplate = $('<div class="chat-line chat-line--new-track"><div class="chat-time"></div><div class="chat-text"><span class="chat-img"></span> <span class="chat-inner-text"></span></div></div>');
	var $simpleChatLineTemplate = $('<div class="chat-line"><div class="chat-time"></div><div class="chat-text"><span class="chat-name"></span> <span class="chat-inner-text"></span></div></div>');
	var $voteChatLineTemplate = $('<div class="chat-line chat-line--sys chat-line--vote" ng-controller="VotingController"><div class="chat-time"></div>'+
		'<div class="chat-text"><span class="chat-name"></span> '+
		'<span class="chat-inner-text"></span>'+
		'<div class="pull-right vote-decision vote-decision--{{decision}}" ng-show="hasBeenDecided()">{{(decision==\'yes\')?\'accepted\':\'crushed\'}}</div>'+
		'<div class="pull-right vote-action-area" ng-hide="hasBeenDecided()">'+
		'<div class="vote-remaining-time">{{remainingSeconds}} Sec</div> '+
		'<div class="btn-group">' + 
		'<button type="button" ng-sdisabled="userHasVoted()" class="btn {{userHasVoted()==\'yes\'?\'btn-success\':\'btn-default\'}} btn-xs" ng-click="vote(\'yes\')">Yes</button> '+
		'<button type="button" ng-sdisabled="userHasVoted()" class="btn {{userHasVoted()==\'no\'?\'btn-danger\':\'btn-default\'}} btn-xs" ng-click="vote(\'no\')">No</button>'+
		'</div>'+
		'</div>'+
		'<span class="votes-cast">'+
		'<span ng-repeat="(username, vote) in votes track by $index"><span class="{{vote==\'yes\'?\'vote-for\':\'vote-against\'}}">{{username}}</span><span ng-hide="$last">, </span></span>'+
		'</span></div></div>');

	function getTimeString(timestamp) {

		var currentTime = new Date(timestamp)
		var hours = currentTime.getHours()
		var minutes = currentTime.getMinutes()

		if (minutes < 10) {
			minutes = "0" + minutes
		}
		var suffix = "AM";
		if (hours >= 12) {
			suffix = "PM";
			hours = hours - 12;
		}
		if (hours == 0) {
			hours = 12;
		}

		return hours + ":" + minutes + " " + suffix;
	}

	socket.chatCallback.add(function(data) {
		var isScrolledDown = ($chatContent.scrollTop() + $chatContent.innerHeight() == $chatContent[0].scrollHeight);
		var $el = $simpleChatLineTemplate.clone();	
		
		if (data.text && data.text.indexOf('/me ') == 0) {
			data.text = data.text.substring(4);
			$el.addClass('chat-line--me');
		}

		if (data.system) {
			$el.addClass('chat-line--sys').addClass('chat-line--' + data.type);
		}

		if (data.system == 'skip') {
			if (data.text) {
				$('.chat-inner-text', $el).text('skipped: "'+data.text+'"');
			} else {
				$('.chat-inner-text', $el).text('skipped');
			}
		} else if (data.system == 'spotifyRequest') {
			var track = data.data;
			$('.chat-inner-text', $el).html('requested <a href="'+track.href+'">' +track.artists[0].name+" — "+ track.name + '</a>');
		} else if (data.system == 'alreadySkipped') {
			$('.chat-inner-text', $el).text('has already skipped, but tried anyway.');
		} else if (data.system == 'inactiveUserWantsToSkip') {
			$('.chat-inner-text', $el).text('tried to skip whilst sitting out. Not in here you don\'t!');
		} else if (data.system == 'love') {
			$('.chat-inner-text', $el).text('just loved this track');
		} else if (data.system == 'unlove') {
			$('.chat-inner-text', $el).text('just un-loved this track');
		} else if (data.system == 'scrobbleOff') {
			$('.chat-inner-text', $el).text('turned scrobbling off');
		} else if (data.system == 'scrobbleOn') {
			$('.chat-inner-text', $el).text('turned scrobbling on');
		} else if (data.system == 'timedOut') {
			$('.chat-inner-text', $el).text('has lost their connection and has been removed from the radio');
		} else if (data.system == 'left') {
			$('.chat-inner-text', $el).text('left');
		} else if (data.system == 'join') {
			$('.chat-inner-text', $el).text('joined');
		} else if (data.system == 'skipSuccessful') {
			$('.chat-inner-text', $el).text('SKIP!');
		} else if (data.system == 'spotifyRequestComplete') {
			var track = data.data;
			$('.chat-inner-text', $el).html('request ready <a href="'+track.identifier+'">' +track.creator+" — "+ track.title + '</a>');
		} else if (data.system == 'startVoting') {
			var vote = data.data;
			$el = $voteChatLineTemplate.clone();
			if (vote.type == 'endOfDay') {
				$('.chat-inner-text', $el).text('proposes to end today\'s Client Room Radio');
			} else if (vote.type == 'discoveryHour') {
				$('.chat-inner-text', $el).text('proposes to start discovery hour');
			}
			$el.attr('ng-init', 'init(\''+ vote.id +'\')');
		} else if (data.system == 'becomesInactive') {
			if (data.text) {
				$('.chat-inner-text', $el).text('left: "'+data.text+'"');
			} else {
				$('.chat-inner-text', $el).text('left');
			}
		} else if (data.system == 'becomesActive') {
			if (data.text) {
				$('.chat-inner-text', $el).text('rejoined: "'+data.text+'"');
			} else {
				$('.chat-inner-text', $el).text('rejoined');
			}
		} else if (data.system == 'newTrack') {
			$el = $newTrackChatLineTemplate.clone();
			$el.id = data.data.timestamp;
			$('.chat-img', $el).html('<a target="_blank" href="' + data.data.extension.trackpage + '"><img class="album-art media-object img-rounded" src="' + (data.data.image?'/image?url='+data.data.image:'/img/crr_128.png') + '"/></a>');
			$('.chat-inner-text', $el).html('<h4><a target="_blank" href="' + data.data.extension.artistpage + '">'+data.data.creator+'</a>' + ' – ' + '<a target="_blank" href="' + data.data.extension.trackpage + '">'+data.data.title+'</a></h4>');
		} else {
			$('.chat-inner-text', $el).html(linkify(data.text));
		} 

		if (data.user) {
			$('.chat-name', $el).text(data.user);
		} else {
			$('.chat-name', $el).text(config.name);
		}
		$('.chat-time', $el).text(getTimeString(data.timestamp));

		if (data.system == 'startVoting') {
			$chatContent.append($compile($el)($scope));
		} else {
			$chatContent.append($el);
		}
		
		if (isScrolledDown) {
			scrollDown();
		}
	});

	$input.keyup(function(e){
		
		var ENTER = 13;
		
		if(e.keyCode == ENTER)
		{
			var inputText = $input.val();
			if (inputText.indexOf('?skip') == 0) {
				inputText = inputText.substring(6);
				socket.sendSkip(inputText);
			} else if (inputText.indexOf('?request') == 0) {
				inputText = inputText.substring(9);
				socket.sendRequest(inputText);
			} else if (inputText.indexOf('?away') == 0) {
				inputText = inputText.substring(6);
				socket.sendActiveStatus(false, inputText);
			} else if (inputText.indexOf('?leave') == 0) {
				inputText = inputText.substring(7);
				socket.sendActiveStatus(false, inputText);
			} else if (inputText.indexOf('?back') == 0) {
				inputText = inputText.substring(6);
				socket.sendActiveStatus(true, inputText);
			} else if (inputText.indexOf('?rejoin') == 0) {
				inputText = inputText.substring(8);
				socket.sendActiveStatus(true, inputText);
			} else {
				socket.sendChatMessage({'user': loggedInAs, 'text': inputText});
			}
			$input.val('');
		}
	});

	// Resize chat area
	$(document).ready(function () {
	    updateContainer();
	    $(window).resize(function() {
	        updateContainer();
	    });
	});

	function updateContainer() {
	    var containerHeight = $(window).height();
	    if ($(window).width() > 768) {
	    	$chatContent.css('height', containerHeight - 355);
		} else {
			$chatContent.css('height', 200);
		}
		scrollDown();
	}

	function scrollDown() {
		$chatContent.scrollTop($chatContent[0].scrollHeight);
	}

	/**
	 * Taken from http://stackoverflow.com/questions/37684/how-to-replace-plain-urls-with-links
	 */
	function linkify(inputText) {
		// Escape first
		inputText = $('<div/>').text(inputText).html();

	    var replacedText, replacePattern1, replacePattern2, replacePattern3;

	    //URLs starting with http://, https://, or ftp://
	    replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
	    replacedText = inputText.replace(replacePattern1, '<a target="_blank" href="$1" target="_blank">$1</a>');

	    //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
	    replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
	    replacedText = replacedText.replace(replacePattern2, '$1<a target="_blank" href="http://$2" target="_blank">$2</a>');

	    return replacedText;
	}
}