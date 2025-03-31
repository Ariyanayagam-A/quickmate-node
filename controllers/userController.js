require('dotenv').config();
const axios = require('axios');
const https = require('https');
const { getMasterAccessToken } = require('./loginController');
const { log } = require('console');


const KEYCLOAK_HOST  = process.env.KEYCLOAK_HOST;

const agent = new https.Agent({
    rejectUnauthorized: false, // disables certificate verification
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
            emailVerified : true,  
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

const getUserInfo = async (req, res) => {
    try {
        const payload = req;
        // console.log('payload : ',payload);
        // console.log('realm : ',req.body.realm);
        const header  = req.headers;
        
        // const masterTokenResponse = await getMasterAccessToken('service', res);

        // const masterToken = masterTokenResponse?.access_token;
        const masterToken = payload.token;
            const response = await axiosInstance.get(
                `${KEYCLOAK_HOST}/admin/realms/Arya/protocol/openid-connect/userinfo`,
                { headers: { Authorization: `Bearer ${masterToken}`, 'Content-Type': 'application/json' } }
            );
            console.log('response : ',response);
        //return response.status == 200 ? res.status(200).json({status : true, message: response.data }) : res.status(response.status).json({status : false, message: response.statusMessage });

    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data || "Internal Server Error",
        });
    }
}


const getUserIdByName = async(req,res) => {
    let payload = req.params;

    const masterTokenResponse = await getMasterAccessToken('service', res);

    const masterToken = masterTokenResponse?.access_token;

    const response = await axios.get(`${KEYCLOAK_HOST}/admin/realms/${payload.account}/users?username=${payload.name}`, {
        headers: {
          'Authorization': `Bearer ${masterToken}`,
          'Content-Type': 'application/json'
        },
        httpsAgent: agent,
      });

      console.log('response : ',response);
      let userId = response.data[0] ? response.data[0].id : false;
      return res.status(200).json({id : userId,message:"User fetched Successfully",status:true})
}

exports.createUser = createUser;
exports.getUserInfo = getUserInfo;
exports.getUserIdByName = getUserIdByName;