// const session = require('express-session');
// const Keycloak = require('keycloak-connect');
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");  
require('dotenv').config();

// const memoryStore = new session.MemoryStore();
// const keycloak = new Keycloak({ store: memoryStore });


const app = express();
const PORT = 3000;

app.use(bodyParser.json());

app.get("/", (req, res) => {

    res.send("Hello World!");

});

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const REALM = process.env.KEYCLOAK_REALM || 'master';
const ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';
const CLIENT_ID = 'admin-cli';

app.post("/register-client", async (req, res) => {
    const token = await getKeycloakToken();
    try {
        const { clientId } = req.body;
        console.log('clientId', clientId);
        if (!clientId) {
            return res.status(400).json({ error: "clientId is required" });
        }

        const response = await axios.post(
            "http://localhost:8080/realms/master/clients-registrations/default",
            { clientId },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`, // Replace with a valid token
                },
            }
        );

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data || "Internal Server Error",
        });
    }
});

const getKeycloakToken = async () => {
    try {
        const response = await axios.post(
            "http://localhost:8080/realms/master/protocol/openid-connect/token",
            new URLSearchParams({
                grant_type: "client_credentials",
                client_id: "admin-cli"
            }),
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error("Error fetching Keycloak token:", error.response?.data || error.message);
        throw new Error("Failed to obtain Keycloak token");
    }
};


const getAdminToken = async () => {
    try {
        const response = await axios.post(
            "http://localhost:8080/realms/master/protocol/openid-connect/token",
            new URLSearchParams({
                grant_type: "password",
                client_id: "admin-cli",
                username: "admin",
                password: "admin",
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        return response.data.access_token;
    } catch (error) {
        console.error("Failed to get token:", error.response?.data || error.message);
        throw new Error("Admin token request failed");
    }
};


app.post("/create-realm", async (req, res) => {
    try {
        const token = await getAdminToken();
        const realmData = req.body;
        if (!realmData.realm) {
            return res.status(400).json({ error: "Realm name is required" });
        }

        const response = await axios.post("http://localhost:8080/admin/realms", realmData, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        res.status(response.status).json({ message: "Realm created successfully" });
    } catch (error) {
        console.error("Error creating realm:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data || "Internal Server Error",
        });
    }
});

app.post("/register-user", async (req, res) => {
    try {
        const token = await getAdminToken();
        const { username, email, password, firstName, lastName } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: "username, email, and password are required" });
        }

        // Create user payload
        const userData = {
            username,
            email,
            firstName: firstName || "",
            lastName: lastName || "",
            enabled: true,
            credentials: [
                {
                    type: "password",
                    value: password,
                    temporary: false,
                },
            ],
        };

        await axios.post(`${KEYCLOAK_URL}/admin/realms/${REALM}/users`, userData, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Error registering user:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data || "Internal Server Error",
        });
    }
});


app.get('/get-users', async (req, res) => {
    try {
        const token = await getAdminToken();

        const response = await axios.get(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/users?max=100`, // Fetch 100 users
            { headers: { Authorization: `Bearer ${token}` } }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Error retrieving users:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to retrieve users from Keycloak' });
    }
});

async function getLdapProviderId(token) {
    try {

      const response = await axios.get(
        `${KEYCLOAK_URL}/admin/realms/${REALM}/components?parent=${REALM}&type=org.keycloak.storage.UserStorageProvider`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('response   ', response.data);
      const ldapProvider = response.data.find(provider => provider.providerId === "ldap");
      return ldapProvider ? ldapProvider.id : "n84Op1XaRk6Ktq0Ten78OQ";
    } catch (error) {
      console.error("Error fetching LDAP provider ID:", error.response?.data || error.message);
      throw new Error("Failed to get LDAP provider ID");
    }
  }
  

  

app.post("/sync-ldap/:syncType", async (req, res) => {
    const { ldapProviderId, syncType } = req.params;
  
    if (!["full", "changed-users"].includes(syncType)) {
      return res.status(400).json({ error: "Invalid sync type. Use 'full' or 'changed-users'." });
    }
  
    try {
      const token = await getAdminToken();
      const ldapProviderId = await getLdapProviderId(token);
  
      const response = await axios.post(
        `${KEYCLOAK_URL}/admin/realms/${REALM}/user-storage/${ldapProviderId}/sync?direction=full`,
        {},
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
  
      res.json({ message: "LDAP Sync initiated", data: response.data });
    } catch (error) {
      console.error("Error syncing LDAP:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to sync LDAP users" });
    }
  });
  
app.get('/check-user/:username', async (req, res) => {
    const { username } = req.params;
    console.log('username', username);
    try {
        const token = await getAdminToken();

        const response = await axios.get(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${username}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.length > 0) {
            res.json({ exists: true, user: response.data[0] });
        } else {
            res.json({ exists: false, message: 'User not found' });
        }
    } catch (error) {
        console.error('Error checking user:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to check user in Keycloak' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


