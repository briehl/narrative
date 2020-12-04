/*jslint white:true,browser:true*/
/**
 * Uses the user's login information to initialize the IPython environment.
 * This should be one of the very first functions to be run on the page, as it sets up
 * the login widget, and wires the environment together.
 * @author Bill Riehl wjriehl@lbl.gov
 */
define ([
    'jquery',
    'bluebird',
    'kbapi',
    'base/js/utils',
    'narrativeConfig',
    'api/auth',
    'userMenu',
    'util/bootstrapDialog'
], function(
    $,
    Promise,
    kbapi,
    JupyterUtils,
    Config,
    Auth,
    UserMenu,
    BootstrapDialog
) {
    'use strict';
    const baseUrl = JupyterUtils.get_body_data('baseUrl');
    const authClient = Auth.make({url: Config.url('auth')});
    let sessionInfo = null;
    let tokenCheckTimer = null;
    let tokenWarningTimer = null;

    const TWO_WEEKS = 1000 * 60 * 60 * 24 * 14;
    const FIVE_MINUTES = 1000 * 60 * 5;

    /* set the auth token by calling the kernel execute method on a function in
     * the magics module
     */
    function ipythonLogin(token) {
        window.kb = new window.KBCacheClient(token); // just as bad as global, but passes linting
        $.ajax({
            url: JupyterUtils.url_join_encode(baseUrl, 'login')
        }).then(
            function() {
                // console.log(ret);
            }
        ).fail(
            function() {
                // console.err(err);
            }
        );
    }

    function ipythonLogout() {
        $.ajax({
            url: JupyterUtils.url_join_encode(baseUrl, 'logout')
        }).then(
            function() {
                // console.log(ret);
            }
        ).fail(
            function() {
                // console.err(err);
            }
        );
        window.location.href = '/';
    }

    function showTokenInjectionDialog() {
        var $inputField = $('<input type="text" class="form-control">');
        var $body = $('<div data-test-id="dev-login">')
            .append('<div>You appear to be working on a local development environment of the Narrative Interface, but you don\'t have a valid auth token. You can paste one in below.</div>')
            .append('<div><b>You are operating in the ' + Config.get('environment') + ' environment.')
            .append($('<div>').append($inputField));
        var dialog = new BootstrapDialog({
            'title': 'Insert an authentication token?',
            'body': $body,
            'buttons': [$('<a type="button" class="btn btn-default">')
                .append('OK')
                .click(function () {
                    dialog.hide();
                    var newToken = $inputField.val();
                    authClient.setCookie({
                        name: 'kbase_session',
                        value: newToken,
                        domain: 'localhost',
                        secure: false
                    });
                    location.reload();
                })]
        });
        dialog.show();
    }

    function showNotLoggedInDialog() {
        var dialog = new BootstrapDialog({
            'title': 'Not Logged In',
            'body': $('<div>').append('You are not logged in (or your session has expired), and you will be redirected to the sign in page shortly.'),
            'buttons': [
                $('<a type="button" class="btn btn-default">')
                    .append('OK')
                    .click(function () {
                        dialog.hide();
                        ipythonLogout();
                    })
            ]
        });
        dialog.show();
    }

    function showAboutToLogoutDialog(tokenExpirationTime) {
        var dialog = new BootstrapDialog({
            'title': 'Expiring session',
            'body': $('<div>').append('Your authenticated KBase session will expire in approximately 5 minutes. To continue using KBase, we suggest you log out and back in.'),
            'buttons': [
                $('<a type="button" class="btn btn-default">')
                    .append('OK')
                    .click(function () {
                        var remainingTime = tokenExpirationTime - new Date().getTime();
                        if (remainingTime < 0) {
                            remainingTime = 0;
                        }
                        tokenWarningTimer = setTimeout(function() {
                            tokenTimeout();
                        });
                        dialog.hide();
                    })
            ]
        });
        dialog.show();
    }

    function initEvents() {
        $(document).on('loggedInQuery.kbase', function(e, callback) {
            if (callback) {
                callback(sessionInfo);
            }
        });

        $(document).on('logout.kbase', function(e, hideMessage) {
            tokenTimeout(!hideMessage);
        });
    }

    function initTokenTimer(tokenExpirationTime) {
        /**
         * First timer - check for token existence very second.
         * trigger the logout behavior if it's not there.
         */
        let lastCheckTime = new Date().getTime();
        const browserSleepValidateTime = Config.get('auth_sleep_recheck_ms');
        let validateOnCheck = false;
        let validationInProgress = false;

        tokenCheckTimer = setInterval(function() {
            var token = authClient.getAuthToken();
            if (!token) {
                tokenTimeout();
            }
            var lastCheckInterval = new Date().getTime() - lastCheckTime;
            if (lastCheckInterval > browserSleepValidateTime) {
                validateOnCheck = true;
            }
            if (validateOnCheck && !validationInProgress) {
                validationInProgress = true;
                authClient.validateToken(token)
                    .then(function(info) {
                        validateOnCheck = false;
                        if (info !== true) {
                            tokenTimeout(true);
                            // console.warn('Auth is invalid! Logging out.');
                        } else {
                            // console.warn('Auth is still valid after ' + (lastCheckInterval/1000) + 's.');
                        }
                    })
                    .catch(function(error) {
                        // This might happen while waiting for internet to reconnect.
                        console.error('Error while validating token after sleep. Trying again...');
                        console.error(error);
                    })
                    .finally(function() {
                        validationInProgress = false;
                    });
                lastCheckTime = new Date().getTime();
            }
        }, 1000);

        const currentTime = Date.now();

        if (currentTime >= tokenExpirationTime) {
            // already expired! logout!
            tokenTimeout();
            return;
        }

        // A warning will be displayed when the token has 5 minutes or 
        // less until expiration.
        var timeToWarning = tokenExpirationTime - currentTime - FIVE_MINUTES;

        // This handles the usage of dev or service tokens, which should only 
        // occur in tests (although I don't think anything prevents a dev from
        // putting a dev token into their browser...)
        // Necessary because setTimeout is signed 32bit, so overflows for 
        // intervals over about 24 days (in ms).
        if (timeToWarning > TWO_WEEKS) {
            console.warn(`Limiting timeToWarning to ${TWO_WEEKS}, was ${timeToWarning}.`);
            timeToWarning = TWO_WEEKS;
        }

        // note that if token is expired according to the comparison above, we do not
        // so the dialog.
        
        // The timer is always started, and will appear when "timeToWarning" elapses, which should be
        // 5 minutes before the token expires, or sooner if the token is expiring less than 5 minutes from now, 
        tokenWarningTimer = setTimeout(function() {
            showAboutToLogoutDialog(tokenExpirationTime);
        }, timeToWarning);
    }

    function clearTokenCheckTimers() {
        if (tokenCheckTimer) {
            clearInterval(tokenCheckTimer);
        }
        if (tokenWarningTimer) {
            clearInterval(tokenWarningTimer);
        }
    }

    /**
     * Timeout the auth token, removing it and invalidating it.
     * This follows a few short steps.
     * 1. If there are timers set for checking token validity, expire them.
     * 2. Delete the token from the browser.
     * 3. Revoke the token from the auth server.
     * 4. Redirect to the logout page, with an optional warning that the user's now logged out.
     */
    function tokenTimeout(showDialog) {
        clearTokenCheckTimers();
        authClient.clearAuthToken();
        authClient.revokeAuthToken(sessionInfo.token, sessionInfo.id);
        // show dialog - you're signed out!
        if (showDialog) {
            showNotLoggedInDialog();
        }
        else {
            ipythonLogout();
        }
    }

    function getAuthToken() {
        return authClient.getAuthToken();
    }

    function init($elem, noServer) {
        /* Flow.
         * 1. Get cookie. If present and valid, yay. If not, dialog / redirect to login page.
         * 2. Setup event triggers. need loggedInQuery.kbase, promptForLogin.kbase, logout.kbase,
         * 3. events to trigger: loggedIn, loggedInFailure, loggedOut
         * 4. Set up user widget thing on #signin-button
         *
         * If noServer is present, then DO NOT try to log in to the ipython kernel. Because it
         * won't be there - this is mainly done if there's an error page, and we still want to
         * show that the user is logged in, and potentially provide a resource to do authenticated
         * communication with other KBase resources.
         */
        clearTokenCheckTimers();
        var sessionToken = authClient.getAuthToken();
        return Promise.all([authClient.getTokenInfo(sessionToken), authClient.getUserProfile(sessionToken)])
            .then(function(results) {
                var tokenInfo = results[0];
                sessionInfo = tokenInfo;
                this.sessionInfo = tokenInfo;
                this.sessionInfo.token = sessionToken;
                this.sessionInfo.kbase_sessionid = this.sessionInfo.id;
                this.sessionInfo.user_id = this.sessionInfo.user;
                initEvents();
                initTokenTimer(sessionInfo.expires);
                UserMenu.make({
                    target: $elem,
                    token: sessionToken,
                    userName: sessionInfo.user,
                    email: results[1].email,
                    displayName: results[1].display
                });
                if (!noServer) {
                    ipythonLogin(sessionToken);
                }
                $(document).trigger('loggedIn', this.sessionInfo);
                $(document).trigger('loggedIn.kbase', this.sessionInfo);
            }.bind(this))
            .catch(function(error) {
                console.error(error);
                if (document.location.hostname.indexOf('localhost') !== -1 ||
                    document.location.hostname.indexOf('0.0.0.0') !== -1) {
                    showTokenInjectionDialog();
                }
                else {
                    showNotLoggedInDialog();
                }
            });
    }

    return {
        init,
        sessionInfo,
        getAuthToken
    };
});
