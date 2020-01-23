import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

const stack = pulumi.getStack();
const config = new pulumi.Config();

const services = [
    "container.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "sqladmin.googleapis.com",
].map(id => {
    new gcp.projects.Service(`service-${id}`, {
        service: id,
        disableDependentServices: true
    });
});

