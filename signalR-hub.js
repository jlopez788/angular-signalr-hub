(function(window, angular, $) {
    'use strict';

    /**
     * @ngInject
     */
    function HubService($rootScope) {
        var globalCn = null;
        var initGlobal = function(options) {
            if (options) {
                if (options.rootPath) {
                    globalCn = $.hubConnection(options.rootPath, { userDefaultPath: false });
                    return;
                }
            }
            globalCn = $.hubConnection();
        };
        var onNotify = function(name, status, isConnected, id, msg, responseText) {
            var result = {
                Result: status,
                id: id,
                msg: msg,
                isConnected: isConnected,
                responseText: responseText
            };
            $rootScope.$broadcast('HubStatus', result);
        };

        return function(hubName, options) {
            var hub = this;
            var opt = {};
            var defaultOptions = {
                rootPath: null,
                listeners: [],
                methods: [],
                queryParams: null
            };

            angular.extend(opt, defaultOptions, options);
            if (globalCn === null) {
                initGlobal(opt);
            }

            hub.name = 'hubs.' + hubName;
            hub.cn = globalCn;
            hub.proxy = hub.cn.createHubProxy(hubName);
            hub.isConnected = false;
            hub.cn.disconnected(function() {
                if (this.lastError) {
                    onNotify(hub.name, 4, false, null, this.lastError.message);
                }
            });
            hub.on = function(event, fn) {
                hub.proxy.on(event, fn);
            };
            hub.invoke = function() {
                return hub.proxy.invoke.app(hub.proxy, arguments);
            };
            hub.trigger = function() {
                $rootScope.$apply();
            };
            hub.disconnect = function() {
                return hub.cn.stop();
            };
            hub.connect = function() {
                hub.isConnected = false;
                return hub.cn.start().done(function(a) {
                    hub.isConnected = true;
                    onNotify(hub.name, 1, true, a.id);
                }).fail(function(a) {
                    var txt = '';
                    hub.isConnected = false;
                    if (a.context) {
                        txt = a.context.responseText;
                    }
                    onNotify(hub.name, 4, false, null, a.message, txt);
                });
            };
            if (opt.listeners) {
                angular.forEach(opt.listeners, function(fn, event) {
                    hub.on(event, function(a) {
                        fn(a);
                        hub.trigger();
                    });
                });
            }
            if (opt.methods) {
                angular.forEach(opt.methods, function(method) {
                    hub[method] = function() {
                        var args = $.makeArray(arguments);
                        args.unshift(method);
                        return hub.invoke.apply(hub, args);
                    };
                });
            }
            if (opt.queryParams) {
                hub.cn.qs = opt.queryParams;
            }

            hub.promise = hub.connect();
            return hub;
        };
    }

    angular.module('SignalR', [])
        .factory('Hub', HubService);
})(window, window.angular, window.$);