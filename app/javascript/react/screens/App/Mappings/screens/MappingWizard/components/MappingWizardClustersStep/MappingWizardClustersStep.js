import React from 'react';
import PropTypes from 'prop-types';
import { Button, noop } from 'patternfly-react';
import { Field, reduxForm } from 'redux-form';
import { length } from 'redux-form-validators';

import ClustersStepForm from './components/ClustersStepForm/ClustersStepForm';
import { FETCH_TARGET_COMPUTE_URLS, QUERY_PROVIDERS_URL } from './MappingWizardClustersStepConstants';
import { getProviderIds } from './helpers';
import { OPENSTACK, RHV } from '../../MappingWizardConstants';

class MappingWizardClustersStep extends React.Component {
  componentDidMount() {
    const { targetProvider, ospConversionHosts, showAlertAction } = this.props;
    this.fetchClusters();
    if (targetProvider === OPENSTACK && ospConversionHosts.length === 0) {
      showAlertAction(
        __('No OpenStack conversion hosts are configured. You can continue to create an infrastructure mapping, but you must configure a conversion host before migration execution.'), // prettier-ignore
        'warning'
      );
    }
  }

  componentWillUnmount() {
    this.props.hideAlertAction();
  }

  fetchClusters = () => {
    const {
      fetchSourceClustersUrl,
      fetchSourceClustersAction,
      fetchTargetComputeUrls,
      fetchTargetClustersAction,
      targetProvider,
      queryHostsUrl,
      queryHostsAction,
      queryProvidersAction,
      queryProvidersUrl
    } = this.props;

    fetchSourceClustersAction(fetchSourceClustersUrl);
    fetchTargetClustersAction(fetchTargetComputeUrls[targetProvider]).then(result => {
      const safeToProceed = result.value && result.value.data && result.value.data.resources.length > 0;

      if (targetProvider === RHV && safeToProceed) {
        const hostIDsByClusterID = result.value.data.resources.reduce(
          (newObject, cluster) => ({
            ...newObject,
            [cluster.id]: cluster.hosts.map(host => host.id)
          }),
          {}
        );
        queryHostsAction(queryHostsUrl, hostIDsByClusterID);
      } else if (targetProvider === OPENSTACK && safeToProceed) {
        queryProvidersAction(queryProvidersUrl, getProviderIds(result.value.data.resources));
      }
    });
  };

  render() {
    const {
      isFetchingSourceClusters,
      sourceClusters,
      isFetchingTargetClusters,
      targetClusters,
      isRejectedSourceClusters,
      isRejectedTargetClusters,
      targetProvider,
      isFetchingHostsQuery,
      hostsByClusterID,
      rhvConversionHosts,
      providers,
      isQueryingProviders
    } = this.props;

    if (isRejectedSourceClusters || isRejectedTargetClusters) {
      return (
        <div className="wizard-pf-complete blank-slate-pf">
          <div className="wizard-pf-success-icon">
            <span className="pficon pficon-error-circle-o" />
          </div>
          <h3 className="blank-slate-pf-main-action">{__('Error Retrieving Clusters')}</h3>
          <p className="blank-slate-pf-secondary-action">
            {__("We're sorry, something went wrong. Please try again.")}
          </p>
          <Button bsStyle="primary" onClick={this.fetchClusters}>
            {__('Retry')}
          </Button>
        </div>
      );
    }
    return (
      <Field
        name="clusterMappings"
        component={ClustersStepForm}
        sourceClusters={sourceClusters}
        targetClusters={targetClusters}
        validate={[length({ min: 1 })]}
        isFetchingSourceClusters={isFetchingSourceClusters}
        isFetchingTargetClusters={isFetchingTargetClusters}
        targetProvider={targetProvider}
        isFetchingHostsQuery={isFetchingHostsQuery}
        hostsByClusterID={hostsByClusterID} // TODO maybe remove?
        rhvConversionHosts={rhvConversionHosts}
        providers={providers}
        isQueryingProviders={isQueryingProviders}
      />
    );
  }
}

MappingWizardClustersStep.propTypes = {
  fetchSourceClustersUrl: PropTypes.string,
  fetchSourceClustersAction: PropTypes.func,
  fetchTargetComputeUrls: PropTypes.object,
  fetchTargetClustersAction: PropTypes.func,
  queryHostsUrl: PropTypes.string,
  queryHostsAction: PropTypes.func,
  showAlertAction: PropTypes.func,
  hideAlertAction: PropTypes.func,
  sourceClusters: PropTypes.arrayOf(PropTypes.object),
  targetClusters: PropTypes.arrayOf(PropTypes.object),
  isFetchingSourceClusters: PropTypes.bool,
  isFetchingTargetClusters: PropTypes.bool,
  isRejectedSourceClusters: PropTypes.bool,
  isRejectedTargetClusters: PropTypes.bool,
  targetProvider: PropTypes.string,
  isFetchingHostsQuery: PropTypes.bool,
  hostsByClusterID: PropTypes.object,
  rhvConversionHosts: PropTypes.array,
  ospConversionHosts: PropTypes.array,
  providers: PropTypes.array,
  isQueryingProviders: PropTypes.bool,
  queryProvidersAction: PropTypes.func,
  queryProvidersUrl: PropTypes.string
};
MappingWizardClustersStep.defaultProps = {
  fetchSourceClustersAction: noop,
  fetchTargetClustersAction: noop,
  queryHostsUrl: '/api/hosts?attributes=tags',
  queryHostsAction: noop,
  isFetchingSourceClusters: true,
  isFetchingTargetClusters: true,
  isRejectedSourceClusters: false,
  isRejectedTargetClusters: false,
  targetProvider: '',
  isFetchingHostsQuery: false,
  hostsByClusterID: {},
  rhvConversionHosts: [],
  ospConversionHosts: [],
  fetchSourceClustersUrl:
    '/api/clusters?expand=resources' +
    '&attributes=ext_management_system.emstype,v_parent_datacenter,ext_management_system.name' +
    '&filter[]=ext_management_system.emstype=vmwarews',
  fetchTargetComputeUrls: FETCH_TARGET_COMPUTE_URLS,
  queryProvidersUrl: QUERY_PROVIDERS_URL
};

export default reduxForm({
  form: 'mappingWizardClustersStep',
  destroyOnUnmount: false
})(MappingWizardClustersStep);
