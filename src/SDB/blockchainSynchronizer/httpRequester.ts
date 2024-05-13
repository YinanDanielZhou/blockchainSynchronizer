import axios, { AxiosResponse } from 'axios';


async function sendGetRequest(url: string, headers: Record<string, string>): Promise<AxiosResponse<any>> {
    try {
        const response = await axios.get(url, { headers });
        return response;
    } catch (error) {
        throw error;
    }
}

export async function getUnconfirmedUTXOByAddress (address: string) {

    const network = 'test'
    const apiUrl = `https://api.whatsonchain.com/v1/bsv/${network}/address/${address}/unconfirmed/unspent`;

    const TaalTestAPIKey = 'testnet_fbfc7b42785206aae6350d8bef8a15f8'
    const customHeaders = {
        'Content-Type': 'application/json',
        'Authorization': TaalTestAPIKey
    };

    sendGetRequest(apiUrl, customHeaders)
        .then(response => {
            console.log('GET unconfirmed UTxO of ${address} response:', response.data);
        })
        .catch(error => {
            console.error('GET unconfirmed UTxO of ${address} Error:', error);
            throw error
        });
}

