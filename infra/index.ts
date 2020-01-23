import * as pulumi from "@pulumi/pulumi";

import * as cluster from "./cluster"
import * as database from "./database"

const config = new pulumi.Config();

const organization = config.get("pulumi-org")
const stack = pulumi.getStack();

const identity = new pulumi.StackReference(`${organization}/identity/${stack}`);

export const clusterName = cluster.clusterName
export const databaseInstanceName = database.databaseInstanceName
export const instanceConnectionName = database.instanceConnectionName
export const dbUser = database.dbUser
export const dbPassword = database.dbPassword


