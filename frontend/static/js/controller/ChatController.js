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
		if (data.text.indexOf('/me ') == 0) {
			data.text = data.text.substring(4);
			$el.addClass('chat-line--me');
		}

		$('.chat-inner-text', $el).text(data.text);
		$('.chat-name', $el).text(data.user);
		$('.chat-time', $el).text(getTimeString());

		$chatContent.append($el);
		scrollDown();
	});

	socket.sysCallback.add(function(data) {
		var $el = $simpleChatLineTemplate.clone();
		$el.addClass('chat-line--sys').addClass('chat-line--' + data.type);

		if (data.type == 'skip') {
			if (data.text) {
				$('.chat-inner-text', $el).text('skipped: "'+data.text+'"');
			} else {
				$('.chat-inner-text', $el).text('skipped.');
			}
		} else if (data.type == 'alreadySkipped') {
			$('.chat-inner-text', $el).text('has already skipped, but tried anyway.');
		} else if (data.type == 'love') {
			$('.chat-inner-text', $el).text('just loved this track');
		} else if (data.type == 'unlove') {
			$('.chat-inner-text', $el).text('just un-loved this track');
		}
		
		$('.chat-name', $el).text(data.user);
		$('.chat-time', $el).text(getTimeString());

		$chatContent.append($el);
		scrollDown();
	})

	$input.keyup(function(e){
		if(e.keyCode == 13)
		{
			var inputText = $input.val();
			if (inputText.indexOf('?skip') == 0) {
				inputText = inputText.substring(6);
				socket.sendSkip(inputText);
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
	    $chatContent.css('height', containerHeight - 375);
	    scrollDown();
	}

	function scrollDown() {
		$chatContent.scrollTop($chatContent[0].scrollHeight);
	}
}