import { getLocationSrv } from '@grafana/runtime';
import { ParseQueryParamDate } from 'shared/components/helpers/time-parameters-parser';
import {
  ALL_VARIABLE_TEXT, AUTO_VARIABLE_TEXT, DEFAULT_COLUMNS, DEFAULT_PAGE_SIZE, FILTERS_NAMES,
} from '../QueryAnalytics.constants';

const setFilters = (query) => FILTERS_NAMES.reduce((acc, filterName) => {
  const filters = query.getAll(`var-${filterName}`);

  if (!filters.length) {
    return acc;
  }

  // if there's only one empty filter use default value
  if (filters.length === 1 && filters[0] === '') {
    acc[filterName] = [ALL_VARIABLE_TEXT];

    return acc;
  }

  acc[filterName] = filters;

  return acc;
}, {});

interface GrafanaVariables {
  columns?: string;
  group_by?: string;
  filter_by?: string;
  order_by?: string;
  from?: string;
  to?: string;
  query_selected?: string;
  details_tab?: string;
  [key: string]: any;
  dimensionSearchText?: string;
}
export const refreshGrafanaVariables = (state) => {
  const {
    labels, columns, groupBy, queryId, orderBy, rawTime, dimensionSearchText, database,
  } = state;

  const variablesQuery: GrafanaVariables = {};

  Object.keys(labels).forEach((key) => {
    const variables = labels[key].length > 1
      ? labels[key].filter((label) => label !== ALL_VARIABLE_TEXT)
      : labels[key];

    variablesQuery[`var-${key}`] = variables.map((variable) => (variable === 'na' ? '' : variable));
  });

  // set defaults when filters are empty
  FILTERS_NAMES.forEach((filter) => {
    const filterName = `var-${filter}`;

    if (!variablesQuery[filterName]) {
      if (filter !== 'interval') {
        variablesQuery[filterName] = [ALL_VARIABLE_TEXT];
      } else {
        variablesQuery[filterName] = [AUTO_VARIABLE_TEXT];
      }
    }
  });

  if (columns) {
    variablesQuery.columns = JSON.stringify(columns);
  }

  if (groupBy) {
    variablesQuery.group_by = groupBy;
  }

  if (database) {
    variablesQuery.selected_query_database = database;
  }

  if (queryId) {
    variablesQuery.filter_by = queryId;
  }

  if (orderBy) {
    variablesQuery.order_by = orderBy;
  }

  if (rawTime && rawTime.from) {
    variablesQuery.from = rawTime.from;
  }

  if (rawTime && rawTime.to) {
    variablesQuery.to = rawTime.to;
  }

  if (dimensionSearchText) {
    variablesQuery.dimensionSearchText = dimensionSearchText;
  }

  variablesQuery.totals = String(state.totals);

  if (state.querySelected) {
    variablesQuery.query_selected = state.querySelected;
  }

  if (state.openDetailsTab) {
    variablesQuery.details_tab = state.openDetailsTab;
  }

  getLocationSrv().update({
    query: variablesQuery,
  });
};

export const parseURL = (query) => ({
  from: ParseQueryParamDate.transform(query.get('from') || 'now-12h', 'from'),
  to: ParseQueryParamDate.transform(query.get('to') || 'now', 'to')
    .utc()
    .format('YYYY-MM-DDTHH:mm:ssZ'),
  columns: JSON.parse(query.get('columns')) || DEFAULT_COLUMNS,
  labels: setFilters(query),
  pageNumber: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  orderBy: query.get('order_by') || `-${(JSON.parse(query.get('columns')) || DEFAULT_COLUMNS)[0]}`,
  queryId: query.get('filter_by'),
  database: query.get('selected_query_database'),
  totals: query.get('totals') === 'true',
  querySelected: !!query.get('filter_by') || query.get('query_selected') === 'true',
  groupBy: query.get('group_by') || 'queryid',
  openDetailsTab: query.get('details_tab') || 'details',
  dimensionSearchText: query.get('dimensionSearchText') || '',
});
export const setLabels = (filters) => Object.keys(filters)
  .filter((filter) => filters[filter])
  .reduce((labels, filter) => {
    const [group, value] = filter.split(':');

    // TODO: using '--' because final form think that it is a nested fields
    //  need to replace it with something better
    if (labels[group]) {
      labels[group].push(value.replace(/--/gi, '.').replace(/^na$/, ''));
    } else {
      // eslint-disable-next-line no-param-reassign
      labels[group] = [value.replace(/--/gi, '.').replace(/^na$/, '')];
    }

    return labels;
  }, {});
