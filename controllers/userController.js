require('dotenv').config();
const axios = require('axios');
const https = require('https');
const { getMasterAccessToken } = require('./loginController');


const KEYCLOAK_HOST  = process.env.KEYCLOAK_HOST;

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Ignore SSL verification
});

const createUser = async (req, res) => {
    try {
        const payload = req.body;

        const masterTokenResponse = await getMasterAccessToken('service', res);

        const masterToken = masterTokenResponse?.access_token;

        let realm = payload.account;

        const userPayload = {
            username      : payload.username,
            firstName     : payload.firstname,
            lastName      : payload.lastname,
            emailVerified : false,  
            email         : payload.email,
            enabled: true,
            credentials: [
                {
                     type: "password",
                     value: payload.password,
                     temporary: false 
                    }
            ],
            requiredActions: ["UPDATE_PASSWORD"] 
        };

        const response = await axiosInstance.post(
            `${KEYCLOAK_HOST}/admin/realms/${realm}/users`,
             userPayload,
            { headers: { Authorization: `Bearer ${masterToken}`, 'Content-Type': 'application/json' } }
        );

        return response.status == 201 ? res.status(200).json({status : true, message: `User ${payload.username} created successfully.` }) : res.status(response.status).json({status : false, message: response.statusMessage });

    } catch (error) {
        console.log('error : ',error.response?.data || error.message);
        console.error(`Error creating user:`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            message : 'Error creating user',
            status : false,
            error: error.response?.data || "Internal Server Error",
        });
    }
}

exports.createUser = createUser;