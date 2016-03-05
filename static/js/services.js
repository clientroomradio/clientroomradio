function initClientRoomRadio(socketUrl) {
    angular.module("crrAngular", [])
    .service("socket", Socket)
    .service("notificationManager", NotificationManager)

    .value("SOCKJS_URL", socketUrl)
    .directive('tooltip', function(){
        return {
            restrict: 'A',
            link: function(scope, element, attrs){
                $(element).hover(function(){
                    // on mouseenter
                    $(element).tooltip('show');
                }, function(){
                    // on mouseleave
                    $(element).tooltip('hide');
                });
            }
        };
    })
    // This is terrible, but it's needed to load the notifications module
    .run(["notificationManager", function (NotificationManager) {}] );
}

