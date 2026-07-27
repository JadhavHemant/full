// const axios = require("axios");

// const BASE_URL = "http://localhost:5351";

// async function getModules() {
//     const response = await axios.get(`${BASE_URL}/api/modules`);
//     return response.data.modules;
// }

// function flattenEndpoints(obj, prefix = "") {
//     const endpoints = [];

//     for (const [key, value] of Object.entries(obj)) {
//         const currentKey = prefix ? `${prefix}.${key}` : key;

//         if (typeof value === "string") {
//             endpoints.push({
//                 name: currentKey,
//                 endpoint: value,
//             });
//         } else if (typeof value === "object" && value !== null) {
//             endpoints.push(...flattenEndpoints(value, currentKey));
//         }
//     }

//     return endpoints;
// }

// async function checkEndpoint(item) {
//     const url = `${BASE_URL}${item.endpoint}`;

//     try {
//         const response = await axios.get(url, {
//             validateStatus: () => true,
//             timeout: 5000,
//         });

//         return {
//             Module: item.name,
//             Endpoint: item.endpoint,
//             Status: response.status,
//             Result:
//                 response.status >= 200 && response.status < 300
//                     ? "✅ OK"
//                     : "❌ Failed",
//         };
//     } catch (err) {
//         return {
//             Module: item.name,
//             Endpoint: item.endpoint,
//             Status: "ERROR",
//             Result: err.message,
//         };
//     }
// }

// async function main() {
//     try {
//         console.log("Fetching module list...\n");

//         const modules = await getModules();

//         const endpoints = flattenEndpoints(modules);

//         console.log(`Found ${endpoints.length} endpoints.\n`);

//         const results = [];

//         for (const endpoint of endpoints) {
//             const result = await checkEndpoint(endpoint);
//             results.push(result);

//             console.log(
//                 `[${result.Result}] ${result.Module} -> ${result.Endpoint} (${result.Status})`
//             );
//         }

//         console.log("\n================ SUMMARY ================\n");

//         console.table(results);

//         const success = results.filter(r => r.Result === "✅ OK").length;
//         const failed = results.length - success;

//         console.log(`Total Endpoints : ${results.length}`);
//         console.log(`Passed          : ${success}`);
//         console.log(`Failed          : ${failed}`);

//     } catch (err) {
//         console.error("Unable to fetch module list.");
//         console.error(err.message);
//     }
// }

// main();





const axios = require("axios");

const BASE_URL = "http://localhost:5351";

const LOGIN = {
    email: "jadhavhemant5351@gmail.com",
    password: "@Vedika7377"
};

// ==============================
// Login
// ==============================
async function login() {
    try {
        console.log("🔐 Logging in...\n");

        const { data } = await axios.post(
            `${BASE_URL}/api/users/login`,
            LOGIN,
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        if (!data.accessToken) {
            console.log(data);
            throw new Error("Access Token not found.");
        }

        console.log("✅ Login Successful");
        console.log(`👤 User : ${data.user.name}`);
        console.log(`🎭 Role : ${data.user.roleName}\n`);

        return data.accessToken;

    } catch (err) {

        console.error("❌ Login Failed");

        if (err.response) {
            console.log(err.response.data);
        } else {
            console.log(err.message);
        }

        process.exit(1);
    }
}

// ==============================
// Get Module List
// ==============================
async function getModules(token) {

    const { data } = await axios.get(
        `${BASE_URL}/api/modules`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return data.modules;
}

// ==============================
// Convert Nested Object to Array
// ==============================
function flatten(obj, parent = "") {

    let result = [];

    for (const [key, value] of Object.entries(obj)) {

        const name = parent ? `${parent}.${key}` : key;

        if (typeof value === "string") {

            result.push({
                module: name,
                endpoint: value
            });

        } else {

            result = result.concat(flatten(value, name));

        }
    }

    return result;
}

// ==============================
// Check API
// ==============================
async function checkApi(api, token) {

    const start = Date.now();

    try {

        const response = await axios.get(
            `${BASE_URL}${api.endpoint}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                timeout: 10000,
                validateStatus: () => true
            }
        );

        const ms = Date.now() - start;

        return {
            Module: api.module,
            Endpoint: api.endpoint,
            Status: response.status,
            Time: `${ms} ms`,
            Result:
                response.status >= 200 &&
                response.status < 300
                    ? "PASS"
                    : "FAIL"
        };

    } catch (err) {

        const ms = Date.now() - start;

        return {
            Module: api.module,
            Endpoint: api.endpoint,
            Status: "ERROR",
            Time: `${ms} ms`,
            Result: err.message
        };
    }
}

// ==============================
// Main
// ==============================
async function main() {

    console.clear();

    console.log("==============================================");
    console.log(" ERP CRM API STATUS CHECKER");
    console.log("==============================================\n");

    // Login
    const token = await login();

    // Get APIs
    console.log("📥 Fetching module list...\n");

    const modules = await getModules(token);

    const apis = flatten(modules);

    console.log(`Found ${apis.length} APIs\n`);

    const results = [];

    for (const api of apis) {

        const result = await checkApi(api, token);

        results.push(result);

        const icon =
            result.Status >= 200 &&
            result.Status < 300
                ? "✅"
                : "❌";

        console.log(
            `${icon} ${result.Status}  ${api.module.padEnd(35)} ${api.endpoint}`
        );
    }

    console.log("\n==============================================");
    console.log("SUMMARY");
    console.log("==============================================\n");

    console.table(results);

    const success = results.filter(
        x => x.Status >= 200 && x.Status < 300
    ).length;

    const failed = results.filter(
        x => !(x.Status >= 200 && x.Status < 300)
    ).length;

    console.log(`Total APIs : ${results.length}`);
    console.log(`Passed     : ${success}`);
    console.log(`Failed     : ${failed}`);

    // Failed APIs
    console.log("\n=========== FAILED APIs ===========\n");

    results
        .filter(x => !(x.Status >= 200 && x.Status < 300))
        .forEach(x => {

            console.log(
                `${x.Status}  ${x.Module}  -->  ${x.Endpoint}`
            );

        });

    console.log("\n✅ Completed.");
}

main();