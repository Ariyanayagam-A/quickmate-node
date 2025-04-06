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
                httpsAgent: agent,
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

        let cretedRoles = [];

        const roles = process.env.DEFAULT_ROLES.split(',').map(role => role.trim());

        for (const role of roles)
            {
            const roleData = {
              name: role,
              description: `${role} role for ${payload.username}`,
            };
      
           const response = await axiosInstance.post(`${KEYCLOAK_HOST}/admin/realms/${payload.username}/roles`, roleData, {
              headers: {
                Authorization: `Bearer ${masterToken}`,
                'Content-Type': 'application/json',
              },
              httpsAgent: agent,
            });

            if(response.status == 201)
            {
                let payloadAPI = {
                    realmname : payload.username,
                    rolename : role,
                    masterToken : masterToken,
                } 

                let response = await getRoleIdByName(req,res,payloadAPI)

                let roledata = {
                    role_uuid : response.data.id,
                    name : response.data.name
                }   
                cretedRoles.push(roledata)
            }
          }

        res.status(200).json({ data : cretedRoles,status:true,message: "Roles created successfully" });
    } catch (error) {
       // console.error("Error creating role call 1 : ", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data || "Internal Server Error",
        });
    }
}

const getRoleIdByName = async(req,res,payload) => {
          
    const response = await axiosInstance.get(`${KEYCLOAK_HOST}/admin/realms/${payload.realmname}/roles/${payload.rolename}`, {
        headers: {
          Authorization: `Bearer ${payload.masterToken}`,
          'Content-Type': 'application/json',
        },
        httpsAgent: agent,
      });

      return response;
}

const enableClientId = async(req,res) => {
    try
    {
        const masterTokenResponse = await getMasterAccessToken('service', res);

        const masterToken = masterTokenResponse?.access_token;

        const clientResponse = await axiosInstance.get(
            `${KEYCLOAK_HOST}/admin/realms/${req.params.realm}/clients?clientId=admin-cli`,
            { headers: { Authorization: `Bearer ${masterToken}`, 'Content-Type': 'application/json' },
            httpsAgent: agent
          }, 
        );

        if (clientResponse.status == 200 ) {
            console.log('clientResponse : ',clientResponse.data)
            const clientId = clientResponse.data[0].id;
            console.log('clientId : ',clientId)

            const updatePayload = {
                authorizationServicesEnabled: true,
                publicClient: false,
                serviceAccountsEnabled: true
            };

            const updateResponse = await axiosInstance.put(
                `${KEYCLOAK_HOST}/admin/realms/${req.params.realm}/clients/${clientId}`,
                updatePayload,
                { 
                 headers: { Authorization: `Bearer ${masterToken}`, 'Content-Type': 'application/json' }, 
                 httpsAgent: agent
               }
            );

            console.log('updateResponse : ',updateResponse);
            
            console.log("client Response",clientResponse);
            
            return res.status(200).json({ 
                message: "Client Authorization and Secret enabled",
                status : true,
                secret : clientResponse.data[0].secret
                
            });

        } 
        else{
            return res.status(404).json({ error: "Client not found" });
        }


        //

      } catch (error) {
        console.error("Error creating role:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data || "Internal Server Error",
        });
    }

}

exports.enableClientId  = enableClientId;
exports.createRealm     = createRealm;
exports.createRoles     = roleCreationService;  