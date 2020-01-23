import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as gcp from "@pulumi/gcp";

const name = "helloworld";

const config = new pulumi.Config();

const organization = config.get("pulumi-org")
const stack = pulumi.getStack();
const infra = new pulumi.StackReference(`${organization}/infra/${stack}`);
const clusterProvider = new k8s.Provider("k8s", {kubeconfig: infra.getOutput("kubeconfig")});

const databaseInstanceName = infra.getOutput("databaseInstanceName");
const instanceConnectionName = infra.getOutput("instanceConnectionName");
const dbUser = infra.getOutput("dbUser");
const dbPassword = infra.getOutput("dbPassword");

let bookSchema = new gcp.sql.Database(`${stack}-book`, {
    instance: databaseInstanceName,
});
let trackSchema = new gcp.sql.Database(`${stack}-track`, {
    instance: databaseInstanceName,
});

let count = config.getNumber("replicaCount") || 1;

const address = new gcp.compute.GlobalAddress("my-static", {
        addressType: "EXTERNAL"
    }
)

export const externalIp = address.address

const ns = new k8s.core.v1.Namespace(stack, {}, {provider: clusterProvider});

export const namespaceName = ns.metadata.name

let account = new gcp.serviceAccount.Account(`${stack}-${name}-account`,
    {
        displayName: `${stack}-${name}-account`,
        accountId: "my-account"
    });


let bindings = [
    "roles/pubsub.admin"
].map(id => {
    new gcp.projects.IAMBinding(`binding-${id}`,
        {
            members: [account.email.apply(v => `serviceAccount:${v}`)],
            role: id
        });
});


let key = new gcp.serviceAccount.Key('application-key',
    {
        serviceAccountId: account.id
    });


const accountKey = key.privateKey

const secret = new k8s.core.v1.Secret("my-secret",
    {
        metadata: {
            namespace: namespaceName,
        },
        stringData: {
            "cloudsql_instance_name": instanceConnectionName,
        },
        data: {
            "account-key": accountKey,
        }
    },
    {
        provider: clusterProvider,
    });

const appLabels = {app: name};
const deployment = new k8s.apps.v1.Deployment(`${stack}-${name}`,
    {
        metadata: {
            namespace: namespaceName,
            labels: appLabels,
        },
        spec: {
            replicas: count,
            selector: {matchLabels: appLabels},
            strategy: {
                type: "Recreate"
            },
            template: {
                metadata: {
                    labels: appLabels,
                },
                spec: {

                    containers: [
                        {
                            name: name,
                            image: "nginxdemos/hello",
                            ports: [
                                {
                                    name: "http",
                                    containerPort: 80
                                }
                            ],
                            env: [
                                {
                                    name: "greeting",
                                    value: "Hello!"
                                },
                                {
                                    name: "GOOGLE_APPLICATION_CREDENTIALS",
                                    value: "/secrets/account-key"
                                }
                            ],
                            volumeMounts: [
                                {
                                    name: "credentials",
                                    mountPath: "/secrets/",
                                    readOnly: true
                                }
                            ]

                        }
                    ],
                    volumes: [
                        {
                            name: "credentials",
                            secret: {
                                secretName: secret.metadata.name
                            }
                        }
                    ]


                }
            }
        },
    },
    {
        provider: clusterProvider,
    }
);

// Export the Deployment name
export const deploymentName = deployment.metadata.name;

const backendConfig = new k8s.apiextensions.CustomResource("my-backend-config",
    {
        apiVersion: "cloud.google.com/v1beta1",
        kind: "BackendConfig",
        metadata: {
            namespace: namespaceName,
            name: "my-backendconfig"
        },
        spec: {
            timeoutSec: 60,
            connectionDraining: {
                drainingTimeoutSec: 70
            }
        }
    },
    {
        provider: clusterProvider
    }
)

export const portsConfig = backendConfig.metadata.name.apply(v => `{ "ports": {"80": "${v}" }}`);

const service = new k8s.core.v1.Service("my-service",
    {
        metadata: {
            labels: appLabels,
            namespace: namespaceName,
            name: "my-service",
            annotations: {
                "beta.cloud.google.com/backend-config": portsConfig
            }
        },
        spec: {
            type: "NodePort",
            ports: [
                {
                    port: 80,
                    targetPort: "http",
                    name: "http"
                }
            ],
            selector: appLabels,
        },
    },
    {
        provider: clusterProvider,
    }
);

const cert = new k8s.apiextensions.CustomResource("managed-cert",
    {
        apiVersion: "networking.gke.io/v1beta1",
        kind: "ManagedCertificate",
        metadata: {
            namespace: namespaceName,
            name: "my-certificate"
        },
        spec: {
            domains: [
                "dev.johankindgren.com"
            ]
        }
    },
    {
        provider: clusterProvider
    }
)

// Create the kuard Ingress
const ingress = new k8s.extensions.v1beta1.Ingress(name,
    {
        metadata: {
            labels: appLabels,
            namespace: namespaceName,
            name: "my-ingress",
            annotations: {
                "networking.gke.io/managed-certificates": cert.metadata.name,
                "kubernetes.io/ingress.global-static-ip-name": address.name
            },
        },
        spec: {
            backend: {
                serviceName: service.metadata.name,
                servicePort: "http",
            }
        }
    },
    {
        provider: clusterProvider
    }
);
