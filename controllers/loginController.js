require('dotenv').config();
const axios = require('axios');
const https = require('https');

const KEYCLOAK_HOST  = process.env.KEYCLOAK_HOST;
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM;
const CLIENT_ID      = process.env.KEYCLOAK_CLIENT_ID;
const ADMIN_USER     = process.env.KEYCLOAK_ADMIN_USER;
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD;

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Ignore SSL verification
});

const getMasterAccessToken = async (req, res) => {
    try {
        const payload = req != 'service' ? req.body : {};

        console.log("Received Payload:", payload);

        const response = await axiosInstance.post(
            `${KEYCLOAK_HOST}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
            new URLSearchParams({
                client_id: CLIENT_ID,
                username: payload.username ?? ADMIN_USER,
                password: payload.password ?? ADMIN_PASSWORD,
                grant_type: 'password'
            }),
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
        );
        // console.log("Response:", response);
         // Return the access token directly
        return 'service' === req ? response.data : res.json(response.data);
        // res.json(response.data);
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data || "Internal Server Error",
        });
    }
}


const getRealmAccessToken = async (req, res) => {  
    try {
        const payload = req.body;
        const header = req.headers;

        console.log("Received Payloadqqq:", payload);
        console.log("Received headers :", req.headers);
        console.log('CLIENT_ID :', CLIENT_ID);
        console.log('Realm name :', payload.username);

        const response = await axiosInstance.post(
            `${KEYCLOAK_HOST}/realms/${payload.username}/protocol/openid-connect/token`,
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: header.authkey,
                grant_type: 'client_credentials'
            }),
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data || "Internal Server Error",
        });
    }
}

exports.getMasterAccessToken = getMasterAccessToken;
exports.getRealmAccessToken  = getRealmAccessToken;