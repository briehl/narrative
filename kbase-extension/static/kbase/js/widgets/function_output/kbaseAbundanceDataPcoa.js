/**
 * KBase widget to display table of BIOM data
 */
define (
	[
		'kbwidget',
		'bootstrap',
		'jquery',
        'narrativeConfig',
		'kbaseAuthenticatedWidget',
		'kbStandalonePlot',
		'RGBColor'
	], (
		KBWidget,
		bootstrap,
		$,
        Config,
		kbaseAuthenticatedWidget,
		kbStandalonePlot,
		RGBColor
	) => {
    return KBWidget({
            name: 'AbundanceDataPcoa',
            parent : kbaseAuthenticatedWidget,
            version: '1.0.0',
            token: null,
            options: {
	            id: null,
	            ws: null,
	            x_axis: "1",
	            y_axis: "2"
        },
        ws_url: Config.url('workspace'),
	    loading_image: Config.get('loading_gif'),

	    init: function(options) {
            this._super(options);
            return this;
        },

        render: function() {
	        const self = this;
	        const pref = this.uuidv4();

	        const container = this.$elem;
	        container.empty();
            if (self.token == null) {
                container.append("<div>[Error] You're not logged in</div>");
                return;
            }
            container.append("<div><img src=\""+self.loading_image+"\">&nbsp;&nbsp;loading data...</div>");

	        const kbws = new Workspace(self.ws_url, {'token': self.token});
	        kbws.get_objects([{ref: self.options.ws+"/"+self.options.id}], (data) => {
	            container.empty();
		        // parse data
		        if (data.length == 0) {
		            const msg = "[Error] Object "+self.options.id+" does not exist in workspace "+self.options.ws;
		            container.append('<div><p>'+msg+'>/p></div>');
		        } else {
		            const pcoa = data[0]['data'];
		            var plen = pcoa['data'].length;
                    let x_pos = parseInt(self.options.x_axis, 10) - 1;
                    let y_pos = parseInt(self.options.y_axis, 10) - 1;
                    if (isNaN(x_pos) || isNaN(y_pos) || (x_pos < 0) || (x_pos > (plen-1)) || (y_pos < 0) || (y_pos > (plen-1))) {
                        x_pos = 0;
                        y_pos = 1;
                    }
		            // do grouping
		            const groups = {};
		            const x_all = new Array(plen);
		            const y_all = new Array(plen);
		            for (var i = 0; i < plen; i++) {
		                // group is id if no group given
		                var data = {
		                    'id': pcoa['data'][i]['id'],
		                    'x': pcoa['data'][i]['pco'][x_pos],
		                    'y': pcoa['data'][i]['pco'][y_pos]
		                }
		                x_all[i] = pcoa['data'][i]['pco'][x_pos];
		                y_all[i] = pcoa['data'][i]['pco'][y_pos];
		                if (pcoa['data'][i]['group'] == "") {
		                    groups[pcoa['data'][i]['id']] = [ data ];
		                } else {
		                    if (groups.hasOwnProperty(pcoa['data'][i]['group'])) {
		                        groups[pcoa['data'][i]['group']].push(data);
		                    } else {
		                        groups[pcoa['data'][i]['group']] = [ data ];
		                    }
		                }
	                }
	                // build series and points
	                const colors = GooglePalette(groups.length);
	                const plotdata = {
	                    'series': [],
	                    'points': []
	                };
	                let num = 0;
	                for (const group in groups) {
	                    const coords = [];
	                    for (var i = 0; i < groups[group].length; i++) {
	                        coords.push({'x': groups[group][i]['x'], 'y': groups[group][i]['y']});
                        }
                        plotdata['series'].push({'name': group, 'color': colors[num], 'shape': 'circle', 'filled': 1});
                        plotdata['points'].push(coords);
                        num += 1;
	                }
			        // PLOT
			        const x_min = Math.min.apply(null, x_all);
			        const x_max = Math.max.apply(null, x_all);
			        const y_min = Math.min.apply(null, y_all);
			        const y_max = Math.max.apply(null, y_all);
                    var plen = 0;
                    if (window.hasOwnProperty('rendererPlot') && rendererPlot.length) {
                        plen = rendererPlot.length;
                    }
                    container.append("<div id='outputPlot"+plen+"' style='width: 95%;'></div>");
                    const plotTest = standalonePlot.create({index: plen});
                    plotTest.settings.target = document.getElementById("outputPlot"+plen);
                    plotTest.settings.data = plotdata;
                    plotTest.settings.x_title = 'PC'+(x_pos+1).toString();
                    plotTest.settings.y_title = 'PC'+(y_pos+1).toString();
                    plotTest.settings.x_min = x_min - Math.abs((x_max - x_min) * 0.1);
                    plotTest.settings.x_max = x_max + Math.abs((x_max - x_min) * 0.1);
                    plotTest.settings.y_min = y_min - Math.abs((y_max - y_min) * 0.1);
                    plotTest.settings.y_max = y_max + Math.abs((y_max - y_min) * 0.1);
			        plotTest.settings.connected = false;
			        plotTest.settings.show_dots = true;
			        plotTest.settings.show_legend = true;
                    plotTest.render(plen);
		        }
	        }, (data) => {
		        container.empty();
		        const main = $('<div>');
		        main.append($('<p>')
		            .css({'padding': '10px 20px'})
		            .text('[Error] '+data.error.message));
		        container.append(main);
	        });
	        return self;
        },

        loggedInCallback: function(event, auth) {
            this.token = auth.token;
            this.render();
            return this;
        },

        loggedOutCallback: function(event, auth) {
            this.token = null;
            this.render();
            return this;
        },

	    uuidv4: function(a,b) {
	        for (b=a=''; a++<36; b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');
	        return b;
	    }
    });
});
