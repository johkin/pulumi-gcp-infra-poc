import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

const stack = pulumi.getStack();

let databaseInstance = new gcp.sql.DatabaseInstance(`farewell-${stack}`,
    {
           databaseVersion: "POSTGRES_11",
        settings: {
               tier: "db-f1-micro"
        },
    });

export const databaseInstanceName = databaseInstance.name
export const instanceConnectionName = databaseInstance.connectionName

let user = new gcp.sql.User("app-user", {
    instance: databaseInstance.name,
    name: "db-user",
    password: "db-password"
});

export const dbUser = user.password
export const dbPassword = user.password





