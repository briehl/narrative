from clustergrammer_widget import *
import pandas as pd

import biokbase.narrative.clients as clients

ws = clients.get('workspace')


def view_as_clustergrammer(ws_ref, col_categories=(), row_categories=(), normalize_on=None):
    assert isinstance(col_categories, (tuple, set, list))
    assert isinstance(row_categories, (tuple, set, list))
    assert normalize_on in {None, "row", "column"}

    generic_df = _get_df(ws_ref, col_categories, row_categories)

    net = Network(clustergrammer_widget)
    net.df_to_dat({'mat': generic_df})
    if normalize_on:
        net.normalize(axis=normalize_on)
    net.cluster(enrichrgram=False)
    return net.widget()


def _get_df(ws_ref, col_categories, row_categories):
    generic_data = ws.get_objects2({'objects': [{'ref': ws_ref}]})['data'][0]['data']
    _is_compatible_matrix(generic_data)
    cols = _get_categories(generic_data['data']['col_ids'],
                           generic_data.get('col_conditionset_ref'),
                           generic_data.get('col_mapping'),
                           col_categories)
    rows = _get_categories(generic_data['data']['row_ids'],
                           generic_data.get('row_conditionset_ref'),
                           generic_data.get('row_mapping'),
                           row_categories)
    return pd.DataFrame(data=generic_data['data']['values'], columns=cols, index=rows)


def _is_compatible_matrix(obj):
    assert 'data' in obj
    assert 'col_ids' in obj['data']
    assert 'row_ids' in obj['data']
    assert 'values' in obj['data']


def _get_categories(ids, conditionset_ref=None, mapping=None, whitelist=()):
    if not conditionset_ref:
        return ids
    cat_list = []
    condition_data = ws.get_objects2({'objects': [{'ref': conditionset_ref}]})['data'][0]['data']

    if not mapping:
        mapping = {x:x for x in ids}

    for _id in ids:
        condition_values = condition_data['conditions'][mapping[_id]]
        cats = [_id]
        for i, val in enumerate(condition_values):
            cat_name = condition_data['factors'][i]['factor']
            if whitelist and cat_name not in whitelist:
                continue
            cats.append("{}:{}".format(cat_name, val))
        cat_list.append(tuple(cats))
    return cat_list





