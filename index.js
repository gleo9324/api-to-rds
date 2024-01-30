/* Amplify Params - DO NOT EDIT
	ENV
	REGION
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
const mysql = require("mysql");

exports.handler = async (event) => {
 
    // Configurazione del database
    const connection = mysql.createConnection({
      host: "host-endpoint",
      port: "3306",
      user: "admin",
      password: "psw",
      database: "dbTest"
    });

// Promisifying the connection query method
    const query = (sql, args) => {
        return new Promise((resolve, reject) => {
            connection.query(sql, args, (err, rows) => {
                if (err)
                    return reject(err);
                resolve(rows);
            });
        });
    };

    // Funzione per eseguire la query e chiudere la connessione
    const runQuery = async (sql, args) => {
        try {
            const rows = await query(sql, args);
            connection.end();
            return rows;
        } catch (error) {
            connection.end();
            throw error;
        }
    };

    // Eseguire la query e ottenere i risultati
    try {
        
        let tableName = event.pathParameters.tableName;
        let result;

        switch (event.httpMethod) {
            case 'GET':
                // Gestire la richiesta GET
                if (event.pathParameters && event.pathParameters.proxy) {
                    const proxyValue = event.pathParameters.proxy;
                    if(proxyValue.startsWith('id:')){
                        const id = proxyValue.slice(3);
                        result = await runQuery(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);    
                    }else if (proxyValue.startsWith('name:')){
                        const name = proxyValue.slice(5);
                        result = await runQuery(`SELECT * FROM ${tableName} WHERE name = ?`, [name]); 
                    }
                } else {
                    result = await runQuery(`SELECT * FROM ${tableName}`);
                }
                break;

            case 'POST':
                // Gestire la richiesta POST
                const requestBody = JSON.parse(event.body);
                const columnNames = Object.keys(requestBody);
                const values = Object.values(requestBody);
                
                const postSql =`INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${Array(columnNames.length).fill('?').join(', ')})`;
                
                result = await runQuery(postSql, values);
                break;
                
            case 'PUT':
                // Gestione richiesta PUT
                const putData = JSON.parse(event.body);
                const putColumnNames = Object.keys(putData);
                const setStatements = putColumnNames.map((columnName) => `${columnName} = ?`).join(', ');
                const putValues = Object.values(putData);
                const putId = event.pathParameters.proxy.slice(3); // Assumendo che l'ID sia passato nell'URL
                const query = `UPDATE ${tableName} SET ${setStatements} WHERE id = ?`;
                const queryParams = [...putValues, putId];
                result = await runQuery(query, queryParams);
                break;

            case 'DELETE':
                const deleteId = event.pathParameters.proxy.slice(3);
                result = await runQuery(`DELETE FROM ${tableName} WHERE id = ?`, [deleteId]);
                break;

            default:
                throw new Error(`Metodo HTTP non supportato: ${event.httpMethod}`);
        }
        return {
            statusCode: 200,
            headers: {
            "Access-Control-Allow-Origin": "*", //da valutare se tenere in ambiente produzione
            },
            body: JSON.stringify(result),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
            "Access-Control-Allow-Origin": "*", //da valutare se tenere in ambiente produzione
        },
            body: JSON.stringify({ error: error.message }),
        };
    }
};