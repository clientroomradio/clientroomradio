function ChatController($scope, $element, socket) {
	var $chatContent= $('.chat-content', $element);
	var $input= $('.chat-input', $element);

	var $simpleChatLineTemplate = $('<div class="chat-line"><div class="chat-time"></div><div class="chat-text"><span class="chat-name"></span> <span class="chat-inner-text"></span></div></div>');
	var $simpleChatLineTemplate = $('<div class="chat-line"><div class="chat-time"></div><div class="chat-text"><span class="chat-name"></span> <span class="chat-inner-text"></span></div></div>');

	function getTimeString() {

		var currentTime = new Date()
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
				$('.chat-inner-text', $el).text('skipped.');
			}
		} else if (data.system == 'request') {
			$('.chat-inner-text', $el).text('requested "' + data.text + '"');
		}else if (data.system == 'alreadySkipped') {
			$('.chat-inner-text', $el).text('has already skipped, but tried anyway.');
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
		} else {
			$('.chat-inner-text', $el).text(data.text);
		}

		
		$('.chat-name', $el).text(data.user);
		$('.chat-time', $el).text(getTimeString());

		$chatContent.append($el);
		scrollDown();
	});

	$input.keyup(function(e){
		if(e.keyCode == 13)
		{
			var inputText = $input.val();
			if (inputText.indexOf('?skip') == 0) {
				inputText = inputText.substring(6);
				socket.sendSkip(inputText);
			} else if (inputText.indexOf('?request') == 0) {
				inputText = inputText.substring(9);
				socket.sendRequest(inputText);
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
	    	$('body').css('overflow', 'hidden');
		} else {
			$chatContent.css('height', 200);
			$('body').css('overflow', 'auto');
		}
	    scrollDown();
	}

	function scrollDown() {
		$chatContent.scrollTop($chatContent[0].scrollHeight);
	}
}