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
                headers: { "Content-Type": "application/x-www-form-urlencoded"},
            }
        );
        
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
        console.log('req : ',req.body)
        const payload = req.body;
        const header = req.headers;
        let adminresponse = await getMasterAccessToken('service',[]);
        console.log('adminresponse :', adminresponse.access_token);
        // console.log('realmname', payload.realm)

        var customerPayload = {}

        // console.log(0)
        // const clientId = await axiosInstance.post(
        //     `http://localhost:8080/admin/realms/${payload.realm}/clients`,{
        //         headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${adminresponse.access_token}` },
        //     }
        // )
        // console.log(1)

        // console.log(clientId)

        if(payload.type == 'org')
        {
            customerPayload = {
                client_id: CLIENT_ID,  
                client_secret: header.authkey,
                grant_type: 'client_credentials'
            }
        }
        else
        {
            customerPayload = {
            client_id: CLIENT_ID,
            username : payload.username,
            password : payload.password,    
            client_secret: header.authkey,
            grant_type: 'password'
            }
        }
        console.log('customPayload : ',customerPayload)
        console.log('payload.realm : ',payload.realm)

        

        // const url = ${KEYCLOAK_HOST}/realms/${payload.realm}/protocol/openid-connect/token
        const response = await axiosInstance.post(
            
            `${KEYCLOAK_HOST}/realms/${payload.realm}/protocol/openid-connect/token`,
            new URLSearchParams(customerPayload),
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${adminresponse.access_token}` },
            }
        ); 

        // let tokenInput = {
        //     token: response.data.access_token,
        //     realm : payload.realm,
        // }
        // console.log('tokenInput :', tokenInput);
        // console.log('data profile :', res1);
        // console.log('response :', response.data);
        res.json(response.data);
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data || "Internal Server Error",
        });
    }
}

// const getRealmUserAccessToken = async (req, res) => {  
//     try
//     {
//         const payload = req.body;
//         const header = req.headers;
//         let adminresponse = await getMasterAccessToken('service',[]);
//         console.log('adminresponse :', adminresponse.access_token);

//         // const url = ${KEYCLOAK_HOST}/realms/${payload.realm}/protocol/openid-connect/token
//         const response = await axiosInstance.post(
            
//             `${KEYCLOAK_HOST}/realms/${payload.realm}/protocol/openid-connect/token`,
//             new URLSearchParams(customPayload),
//             {
//                 headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${adminresponse.access_token}` },
//             }
//         );

//         res.json(response.data);
//     } catch (error) {
//         console.error("Error:", error.response?.data || error.message);
//         res.status(error.response?.status || 500).json({
//             error: error.response?.data || "Internal Server Error",
//         });
//     }
// }

const agent = new https.Agent({
    rejectUnauthorized: false, // disables certificate verification
  });

async function getUserProfile(payload) {
    const realm = payload.realm; // update this to your realm
    //const keycloakHost = 'https://your-keycloak-domain.com'; // update this to your Keycloak host
    const userInfoUrl = `${KEYCLOAK_HOST}/admin/realms/${realm}/user/profile`;
  
    try {
      const response = await axios.get(userInfoUrl, {
        headers: {
          Authorization: `Bearer ${payload.token}`,
        },
        httpsAgent: agent, // add this agent to bypass certificate verification
      });
      console.log('User Profile:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error.response?.data || error.message);
      throw error;
    }
  }
  

exports.getMasterAccessToken = getMasterAccessToken;
exports.getRealmAccessToken  = getRealmAccessToken;
// exports.getRealmUserAccessToken = getRealmUserAccessToken;