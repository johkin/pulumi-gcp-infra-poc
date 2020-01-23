import * as gcp from "@pulumi/gcp";
import {masterVersion, nodeCount, nodeMachineType, preemptible} from "./config";
import * as pulumi from "@pulumi/pulumi";

const stack = pulumi.getStack();

const cluster = new gcp.container.Cluster(`${stack}-cluster`, {
    initialNodeCount: 1,
    minMasterVersion: masterVersion,
    removeDefaultNodePool: true
});
const nodePool = new gcp.container.NodePool("preemtible-pool", {
    cluster: cluster.name,
    nodeConfig: {

        machineType: nodeMachineType,
        metadata: {
            "disable-legacy-endpoints": "true",
        },
        preemptible: preemptible,
    },
    nodeCount: nodeCount,
});

// Manufacture a GKE-style kubeconfig. Note that this is slightly "different"
// because of the way GKE requires gcloud to be in the picture for cluster
// authentication (rather than using the client cert/key directly).
export const kubeconfig = pulumi.all([cluster.name, cluster.endpoint, cluster.masterAuth]).apply(([name, endpoint, masterAuth]) => {
    const context = `${gcp.config.project}_${gcp.config.zone}_${name}`;
    return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${masterAuth.clusterCaCertificate}
    server: https://${endpoint}
  name: ${context}
contexts:
- context:
    cluster: ${context}
    user: ${context}
  name: ${context}
current-context: ${context}
kind: Config
preferences: {}
users:
- name: ${context}
  user:
    auth-provider:
      config:
        cmd-args: config config-helper --format=json
        cmd-path: gcloud
        expiry-key: '{.credential.token_expiry}'
        token-key: '{.credential.access_token}'
      name: gcp
`;
});
export const clusterName = cluster.name;
