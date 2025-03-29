require('dotenv').config();
const axios = require('axios');
const https = require('https');
const { getMasterAccessToken } = require('./loginController');

const KEYCLOAK_HOST  = process.env.KEYCLOAK_HOST;

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Ignore SSL verification
});

const createRealm = async (req, res) => {
    try {
        let payload = req.body;
        const header  = req.headers;
        
        const masterTokenResponse = await getMasterAccessToken('service', res);

        const masterToken = masterTokenResponse?.access_token;

        let payloadData = { id: payload.username, realm: payload.username, enabled: true }

        const response = await axiosInstance.post(
            `${KEYCLOAK_HOST}/admin/realms`,
               payloadData,
             {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${masterToken}`,
                },
            }
        );

        return response.status == 201 ? res.status(200).json({ accountId : payload.username ,status : true,message: "Account Created Successfully"}) : res.status(response.status).json({status:false, message: response.statusMessage })

    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data || "Internal Server Error",
        });
    }

};


const roleCreationService = async (req, res) => {
    try 
    {
        const masterTokenResponse = await getMasterAccessToken('service', res);

        const masterToken = masterTokenResponse?.access_token;

        const payload = req.body;

        // if (!roleName) {
        //     return res.status(400).json({ error: "role is required" });
        // }

        const roles = process.env.DEFAULT_ROLES.split(',').map(role => role.trim());

        for (const role of roles){
            const roleData = {
              name: role,
              description: `${role} role for ${payload.username}`,
            };
      
            await axiosInstance.post(`${KEYCLOAK_HOST}/admin/realms/${payload.username}/roles`, roleData, {
              headers: {
                Authorization: `Bearer ${masterToken}`,
                'Content-Type': 'application/json',
              },
            });
      
            // console.log(`Roles "${role}" created successfully!`);
          }

        res.status(200).json({ status:true,message: "Roles created successfully" });
    } catch (error) {
        console.error("Error creating role:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data || "Internal Server Error",
        });
    }
}


exports.createRealm  = createRealm;
exports.createRoles  = roleCreationService;