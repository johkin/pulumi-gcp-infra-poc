# POC for Pulumi GCP

This is a lab for trying out how to setup infrastructure for 
Kubernetes based deployments.

Pulumi docs: https://www.pulumi.com/docs/

The infrastructure is divided into three Pulumi-projects, that are 
referenced from each of them:

* Identity: Used to enable API's in GCP (probably only one stack needed)
* Infra: Used to create common infrastructure (shared infrastructure for dev and test, but separate instances for prod)
* App: Used to create infrastructure that are unique for each stack (dev, test, prod)

1. In your GCP project, create a service-account that have roles:
    * project owner
    * Kubernetes Engine Admin
1. Create and export a json-key for the service-account
1. Update the yaml-files with the GCP-project details

In each project-dir, modify the file Pulumi.dev.yaml to use the correct 
gcp values:
```
config:
   gcp:project: <my-gcp-project>
   gcp:credentials: {
     <my-exported-service-account-key>
   }
   gcp:zone: europe-west1-b
   gcp:region: europe-west1
```
To set the gcp:credentials as a secret with the contents of a 
json-file, pipe the file to the pulumi-cli:
```
cat ../pulumi-labs-key.json | pulumi config set gcp:credentials --secret
```

###Note!
In the infra- and app-configs, update the value of "pulumi-org" to match 
your Pulumi-account/organization! 


