define(['widgets/appWidgets2/input/intInput', 'common/runtime', 'testUtil'], (
    IntInput,
    Runtime,
    TestUtil
) => {
    'use strict';

    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    describe('Test int data input widget', () => {
        let testConfig = {},
            runtime,
            bus;

        beforeEach(() => {
            runtime = Runtime.make();
            bus = runtime.bus().makeChannelBus({
                description: 'int input testing',
            });
            testConfig = {
                bus: bus,
                parameterSpec: {
                    data: {
                        defaultValue: 1,
                        nullValue: '',
                        constraints: {
                            required: false,
                            min: -1000,
                            max: 1000,
                        },
                    },
                    original: {
                        text_subdata_options: {},
                    },
                },
                channelName: bus.channelName,
            };
        });

        afterEach(() => {
            bus.stop();
            window.kbaseRuntime = null;
        });

        it('should be real!', () => {
            expect(IntInput).not.toBeNull();
        });

        it('should instantiate with a test config', () => {
            TestUtil.pendingIfNoToken();
            const widget = IntInput.make(testConfig);
            expect(widget).toEqual(jasmine.any(Object));
        });

        it('should start and stop properly without initial value', (done) => {
            const widget = IntInput.make(testConfig);
            const node = document.createElement('div');
            widget
                .start({ node: node })
                .then(() => {
                    expect(node.childElementCount).toBeGreaterThan(0);
                    const input = node.querySelector('input[data-type="int"]');
                    expect(input).toBeDefined();
                    expect(input.getAttribute('value')).toBeNull();
                    return widget.stop();
                })
                .then(() => {
                    expect(node.childElementCount).toBe(0);
                    done();
                });
        });

        it('should start and stop properly with initial value', (done) => {
            testConfig.initialValue = 10;
            const widget = IntInput.make(testConfig);
            const node = document.createElement('div');
            widget
                .start({ node: node })
                .then(() => {
                    expect(node.childElementCount).toBeGreaterThan(0);
                    const input = node.querySelector('input[data-type="int"]');
                    expect(input).toBeDefined();
                    expect(input.getAttribute('value')).toBe(String(testConfig.initialValue));
                    return widget.stop();
                })
                .then(() => {
                    expect(node.childElementCount).toBe(0);
                    done();
                });
        });

        it('should update model properly with change event', (done) => {
            bus.on('changed', (value) => {
                expect(value).toEqual({ newValue: 1 });
                done();
            });
            const widget = IntInput.make(testConfig);
            const node = document.createElement('div');
            widget.start({ node: node }).then(() => {
                const input = node.querySelector('input[data-type="int"]');
                input.setAttribute('value', 1);
                input.dispatchEvent(new Event('change'));
            });
        });

        xit('should update model properly with keyup/touch event', (done) => {
            const widget = IntInput.make(testConfig);
            const node = document.createElement('div');
            bus.on('validation', (message) => {
                expect(message.isValid).toBeFalsy();
                done();
            });
            widget.start({ node: node }).then(() => {
                const input = node.querySelector('input[data-type="int"]');
                input.value = 'foo';
                input.setAttribute('value', 'foo');
                input.dispatchEvent(new KeyboardEvent('keyup', { key: 3 }));
            });
        });

        it('should show message when configured', (done) => {
            testConfig.showOwnMessages = true;
            const widget = IntInput.make(testConfig);
            const node = document.createElement('div');
            bus.on('validation', done);
            widget.start({ node: node }).then(() => {
                const input = node.querySelector('input[data-type="int"]');
                input.setAttribute('value', 5);
                input.dispatchEvent(new Event('change'));
            });
        });

        it('should respond to update command', (done) => {
            bus.on('validation', done);
            const widget = IntInput.make(testConfig);
            const node = document.createElement('div');
            widget.start({ node: node }).then(() => {
                bus.emit('update', { value: 12345 });
            });
        });

        it('should respond to reset command'),
            (done) => {
                bus.on('validation', done);
                const widget = IntInput.make(testConfig);
                const node = document.createElement('div');
                widget.start({ node: node }).then(() => {
                    bus.emit('reset-to-defaults');
                });
            };
    });
});
