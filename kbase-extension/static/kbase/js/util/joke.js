define([
    'jquery',
    'util/bootstrapDialog',
    'util/display'
], function(
    $,
    BootstrapDialog,
    DisplayUtil
) {
    'use strict';
    var loader = DisplayUtil.loadingDiv(),
    $body = $('<div>'),
    dialog = new BootstrapDialog({
        title: 'Shane says...',
        body: $body,
        closeButton: true,
        alertOnly: true
    });

    function initBody() {
        $body.empty().append(loader.div);
    }

    function fetchJoke() {
        Promise.resolve($.ajax({
            url: 'https://icanhazdadjoke.com',
            dataType: 'json'
        }))
        .then((result) => {
            $body.empty().append(result.joke);
        });
    }

    function tell() {
        initBody();
        fetchJoke();
        dialog.show();
    }

    return {
        tell: tell
    };
});