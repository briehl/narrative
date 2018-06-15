define([
    'jquery',
    'bluebird',
    'base/js/namespace',
    'util/bootstrapDialog',
    'narrativeConfig',
    'kb_service/client/narrativeMethodStore',
], function(
    $,
    Promise,
    Jupyter,
    BootstrapDialog,
    Config,
    NarrativeMethodStore
) {
    'use strict';

    // TODO: add to utility module
    function isAppCell(cell) {
        return cell.metadata &&
               cell.metadata.kbase &&
               cell.metadata.kbase.type &&
               cell.metadata.kbase.type === 'app';
    };

    // TODO: add to api module. NMS wrapper?
    // TODO: handle apps with different tags. Multiple api calls. (up to 3, eh?)
    function appsToCitations(appIds) {
        let nms = new NarrativeMethodStore(Config.url('narrative_method_store'));
        return Promise.resolve(nms.get_method_full_info({ids: appIds}))
            .then((appInfo) => {
                return appInfo.map((info) => {
                    return {
                        id: info.id,
                        name: info.name,
                        citations: info.publications
                    };
                });
            });
    };

    var AppCitations = function () {
        this.$body = $('<div/>');
        this.dialog = new BootstrapDialog({
            title: 'App Citations',
            body: this.$body,
            closeButton: true,
            alertOnly: true
        });
    };

    AppCitations.prototype.show = function () {
        let cells = Jupyter.notebook.get_cells();
        this.$body.empty();
        let appIds = cells.map((cell) => {
            if (isAppCell(cell)) {
                return cell.metadata.kbase.appCell.app.id;
            }
        }).filter((value, index, self) => value && self.indexOf(value) === index);
        appsToCitations(appIds)
        .then((apps) => {
            let $list = $('<ol>');
            apps.forEach((app) => {
                $list.append(buildCitations(app));
            });
            this.$body.append($list);
        });
        this.dialog.show();
    };

    function buildCitations (appInfo) {
        let $block = $('<li>')
            .append($('<div><b>' + appInfo.name + '</b><div>'));
        if (!appInfo.citations || appInfo.citations.length === 0) {
            $block.append($('<div>no citations</div>'));
        }
        let $citeList = $('<ul>');
        appInfo.citations.forEach((citation) => {
            let text = citation.display_text;
            if (citation.link) {
                text = '<a href="' + citation.link + '">' + text + '</a>';
            }
            $citeList.append($('<li>' + text + '</li>'));
        });
        $block.append($citeList).append($('<br>'));
        return $block;
    };

    return AppCitations;
});