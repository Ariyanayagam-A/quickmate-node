require('dotenv').config();
const axios = require('axios');
const https = require('https');
const { getMasterAccessToken } = require('./loginController');
const { log } = require('console');


const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM;
const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID;
const ADMIN_USER = process.env.KEYCLOAK_ADMIN_USER;
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD;


const KEYCLOAK_HOST  = process.env.KEYCLOAK_HOST;

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Ignore SSL verification
});

const agent = new https.Agent({
    rejectUnauthorized: false, // disables certificate verification
  });

  async function getAccessToken() {
    try {
        const response = await axiosInstance.post(
            `${KEYCLOAK_HOST}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
            new URLSearchParams({
                client_id: CLIENT_ID,
                username: ADMIN_USER,
                password: ADMIN_PASSWORD,
                grant_type: 'password'
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        return response.data.access_token;
    } catch (error) {
        console.error("❌ Error getting access token:", error.response?.data || error.message);
        return null;
    }
}

const createUser = async (req, res) => {
    try {
        const payload = req.body;
        console.log(payload)
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

        console.log(response)

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
            const response2php = "hji"
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

const ldabVerification = async(req,res) => {
    
    const reqBody = req.body
    console.log(reqBody)
    const getRealmId = async function getRealmId(realmName, realmToken) {
        
      const response = await axios.get(
        `${KEYCLOAK_HOST}/admin/realms/${realmName}`,
        {
          headers: {
            Authorization: `Bearer ${realmToken}`,
          },
        }
      );
      
      return response.data.id;
    }
  
    const emailVerification = async function updateAllUsersEmailVerified(realmName, realmToken) {
      try {
        const getUsersResponse = await axios.get(
          `${KEYCLOAK_HOST}/admin/realms/${realmName}/users`,
          {
            headers: {
              Authorization: `Bearer ${realmToken}`,
            },
          }
        );
    
        const users = getUsersResponse.data;
        if (!users.length) {
          console.log("⚠️ No users found in the realm.");
          return;
        }
    
        for (const user of users) {
          if (!user.emailVerified) {
            await axios.put(
              `${KEYCLOAK_HOST}/admin/realms/${realmName}/users/${user.id}`,
              { ...user, emailVerified: true },
              {
                headers: {
                  Authorization: `Bearer ${realmToken}`,
                  "Content-Type": "application/json",
                },
              }
            );
            console.log(`✅ Updated email verification for user: ${user.username}`);
          }
        }
      } catch (error) {
        console.error("❌ Error updating users:", error.response ? error.response.data : error.message);
      }
    }
  
  
    try {
      const realmToken = await getAccessToken();
      const realmName = reqBody.domain_name; 
      const realmId = await getRealmId(realmName, realmToken);
  
      console.log(`✅ Realm ID for ${realmName}:`, realmId);
  
      const ldapConfig = {
        name: "AzureAD-LDAP",
        providerId: "ldap",
        providerType: "org.keycloak.storage.UserStorageProvider",
        parentId: realmId, // Use dynamic realm ID
        config: {
          enabled: ["true"],
          priority: ["0"],
          authType: ["simple"],
          bindDn: [reqBody.ldap_id],
          bindCredential: [reqBody.ldap_password],
          connectionUrl: [reqBody.connection_url],
          usersDn: ["CN=Users,DC=demodc,DC=local"],
          usernameLDAPAttribute: ["sAMAccountName"],
          rdnLDAPAttribute: ["cn"],
          uuidLDAPAttribute: ["objectGUID"],
          userObjectClasses: ["user", "person", "organizationalPerson"],
          editMode: ["READ_ONLY"],
          syncRegistrations: ["true"],
          trustEmail: ["false"],
          importEnabled: ["true"],
        },
      };
  
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });
  
      const createResponse = await axios.post(
        `/admin/realms/${realmName}/components`,
        ldapConfig,
        {
          headers: {
            Authorization: `Bearer ${realmToken}`,
            "Content-Type": "application/json",
          },
          httpsAgent,
        }
      );
  
      console.log("✅ LDAP Connection Created:", createResponse.data);
  
      const getResponse = await axios.get(
        `${KEYCLOAK_HOST}/admin/realms/${realmName}/components?type=org.keycloak.storage.UserStorageProvider`,
        {
          headers: {
            Authorization: `Bearer ${realmToken}`,
          },
          httpsAgent,
        }
      );
  
      // if (!getResponse.data || getResponse.data.length === 0) {
      //   throw new Error("❌ LDAP provider not found in the realm.");
      // }
  
      const providerId = getResponse.data[0].id;
      console.log("✅ LDAP Provider ID:", providerId);
  
      const syncResponse = await axios.post(
        `${KEYCLOAK_HOST}/admin/realms/${realmName}/user-storage/${providerId}/sync?action=triggerFullSync`,
        {},
        {
          headers: {
            Authorization: `Bearer ${realmToken}`,
          },
          httpsAgent,
        }
      );
  
      console.log("✅ LDAP Sync Triggered:", syncResponse.data);
  
      // Ensure Email Verification Mapper
      // await createLdapEmailMapper(realmName, providerId, realmToken);
      // console.log("✅ Email verification for LDAP users enabled.");
      
      // Update all existing users to set emailVerified = true
      await emailVerification(realmName, realmToken);
      console.log("✅ All users email verification set to TRUE.");
      return res.status(200).json({status : true, message: `Ldap created successfully.` })
    } catch (error) {
      console.error("❌ Error:", error.response ? error.response.data : error.message);
    }
   
  }

exports.createUser = createUser;
exports.getUserInfo = getUserInfo;
exports.getUserIdByName = getUserIdByName;
exports.ldabVerification = ldabVerification;