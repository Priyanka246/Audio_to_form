// import env from "react-dotenv";
import React, { Component } from 'react';
import { Container } from 'reactstrap';
import { getTokenOrRefresh } from './token_util';
import './custom.css'
import { ResultReason } from 'microsoft-cognitiveservices-speech-sdk';
const { TextAnalyticsClient, AzureKeyCredential } = require("@azure/ai-text-analytics");

const speechsdk = require('microsoft-cognitiveservices-speech-sdk')
const key = "74a923d95b0a42d585a5d5e5ae6bf708";
const endpoint = "https://maialanguage.cognitiveservices.azure.com/";


console.log(key, endpoint);
const client = new TextAnalyticsClient(endpoint, new AzureKeyCredential(key));


export default class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            displayText: 'INITIALIZED: ready to test speech...',
            entities: [],
            medication: [],
            diagnosis: [],
            symptoms: []

        }
    }

    async componentDidMount() {
        // check for valid speech key/region
        const tokenRes = await getTokenOrRefresh();
        if (tokenRes.authToken === null) {
            this.setState({
                displayText: 'FATAL_ERROR: ' + tokenRes.error
            });
        }
    }


    async main(data) {
        console.log("== Recognize Healthcare Entities Sample ==", data);


        const poller = await client.beginAnalyzeHealthcareEntities([data], "en", {
            includeStatistics: true,
        });
        console.log(poller, "poller");
        poller.onProgress(() => {
            console.log(
                `Last time the operation was updated was on: ${poller.getOperationState().lastModifiedOn}`
            );
        });
        console.log(
            `The analyze healthcare entities operation was created on ${poller.getOperationState().createdOn
            }`
        );
        console.log(
            `The analyze healthcare entities operation results will expire on ${poller.getOperationState().expiresOn
            }`
        );

        const results = await poller.pollUntilDone();
        console.log(results, "results");
        for await (const result of results) {
            console.log(`- Document ${result.id}`);
            if (!result.error) {
                console.log(result.entities, "result.entities");
                return result.entities
            } else console.error("\tError:", result.error);
        }
    }

    async sttFromMic() {
        console.log("sttFromMicsttFromMic");
        const tokenObj = await getTokenOrRefresh();
        const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(tokenObj.authToken, tokenObj.region);
        speechConfig.speechRecognitionLanguage = 'en-US';

        const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);

        this.setState({
            displayText: 'speak into your microphone...'
        });

        recognizer.recognizeOnceAsync(async result => {
            let displayText;
            let entities = [];
            let medication = [];
            let diagnosis = [];
            let symptoms = [];
            if (result.reason === ResultReason.RecognizedSpeech) {

                let recog_text = await this.main(result.text)
                displayText = result.text
                console.log("\tRecognized Entities check:", recog_text);
                if (recog_text.length) {
                    for (const entity of recog_text) {
                        console.log(entity, "entityentity");
                        switch (entity.category) {
                            case "MedicationName":
                                medication.push(entity.text);
                                break;
                            case "SymptomOrSign":
                                symptoms.push(entity.text);
                                break;
                            case "Diagnosis":
                                diagnosis.push(entity.text);
                                break;
                        }
                        console.log(`\t- Entity "${entity.text}" of type ${entity.category}`);
                        // displayText = `Categorised words`
                        entities.push(`\t- Entity "${entity.text}" of type ${entity.category} \n`)
                        if (entity.dataSources.length > 0) {
                            console.log("\t and it can be referenced in the following data sources:");
                            for (const ds of entity.dataSources) {
                                console.log(`\t\t- ${ds.name} with Entity ID: ${ds.entityId}`);
                            }
                        }
                    }
                }

                if (recog_text && recog_text.entityRelations && recog_text.entityRelations.length > 0) {
                    console.log(`\tRecognized relations between entities:`);
                    for (const relation of result.entityRelations) {
                        console.log(
                            `\t\t- Relation of type ${relation.relationType} found between the following entities:`
                        );
                        for (const role of relation.roles) {
                            console.log(`\t\t\t- "${role.entity.text}" with the role ${role.name}`);
                        }
                    }
                }

            } else {
                displayText = 'ERROR: Speech was cancelled or could not be recognized. Ensure your microphone is working properly.';
            }

            this.setState({
                displayText: displayText,
                entities: entities,
                medication: medication,
                diagnosis: diagnosis,
                symptoms: symptoms
            });
        });
    }

    async fileChange(event) {
        const audioFile = event.target.files[0];
        console.log(audioFile);
        const fileInfo = audioFile.name + ` size=${audioFile.size} bytes `;

        this.setState({
            displayText: fileInfo
        });

        const tokenObj = await getTokenOrRefresh();
        const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(tokenObj.authToken, tokenObj.region);
        speechConfig.speechRecognitionLanguage = 'en-US';

        const audioConfig = speechsdk.AudioConfig.fromWavFileInput(audioFile);
        const recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);

        recognizer.recognizeOnceAsync(async result => {
            let displayText;
            let entities = [];
            if (result.reason === ResultReason.RecognizedSpeech) {

                let recog_text = await this.main(result.text)
                displayText = result.text
                console.log("\tRecognized Entities check:", recog_text);
                if (recog_text.length) {
                    for (const entity of recog_text) {
                        console.log(entity, "entityentity");
                        console.log(`\t- Entity "${entity.text}" of type ${entity.category}`);

                        entities.push(`\t- Entity "${entity.text}" of type ${entity.category} \n`)
                        if (entity.dataSources.length > 0) {
                            console.log("\t and it can be referenced in the following data sources:");
                            for (const ds of entity.dataSources) {
                                console.log(`\t\t- ${ds.name} with Entity ID: ${ds.entityId}`);
                            }
                        }
                    }
                }

                if (recog_text && recog_text.entityRelations && recog_text.entityRelations.length > 0) {
                    console.log(`\tRecognized relations between entities:`);
                    for (const relation of result.entityRelations) {
                        console.log(
                            `\t\t- Relation of type ${relation.relationType} found between the following entities:`
                        );
                        for (const role of relation.roles) {
                            console.log(`\t\t\t- "${role.entity.text}" with the role ${role.name}`);
                        }
                    }
                }

            } else {
                displayText = 'ERROR: Speech was cancelled or could not be recognized. Ensure your microphone is working properly.';
            }

            this.setState({
                displayText: displayText,
                entities: entities,
            });
        });
    }

    render() {
        return (
            <Container className="app-container">
                <h1 className="display-4 mb-3">Audio to form</h1>

                <div className="row main-container">
                    <div className="col-6">
                        <h5 className='heading'>Actions</h5>
                        <div className='speech-block'>
                            <i className="fas fa-microphone fa-lg mr-2" onClick={() => this.sttFromMic()}></i>
                            <p>Convert speech to text from your mic.</p>
                        </div>

                        <div className="mt-2">
                            <div className='speech-block'>
                                <label htmlFor="audio-file"><i className="fas fa-file-audio fa-lg mr-2"></i></label>
                                <input
                                    type="file"
                                    id="audio-file"
                                    onChange={(e) => this.fileChange(e)}
                                    style={{ display: "none" }}
                                />
                                <p>Convert speech to text from an audio file.</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-6">
                        <h5 className='heading'>Recognised text</h5>
                        <div className='output-display rounded'>
                            <code>{this.state.displayText} </code>
                        </div>
                    </div>

                </div>
                <div className="row main-container">
                    <div className="col-6">
                        <h5 className='heading'>Form:</h5>
                        <div className='card-block'>
                            <form readOnly>
                                <div className='input-group'>
                                    <label htmlFor='diagnosis'> Diagnosis :</label>
                                    <textarea id='diagnosis' type="text" value={this.state.diagnosis.toString()} name="diagnosis"></textarea>
                                </div>
                                <div className='input-group'>
                                    <label htmlFor='symptoms'> Symptoms :</label>
                                    <textarea id='symptoms' type="text" value={this.state.symptoms.toString()} name="symptoms"></textarea>
                                </div>
                                <div className='input-group'>
                                    <label htmlFor='medication'> Medication :</label>
                                    <textarea id='medication' type="text" value={this.state.medication.toString()} name="medication"></textarea>
                                </div>
                                {/* <label>
                                symptoms:
                                <input type="text" value={this.state.symptoms.toString()} name="symptoms" />
                            </label>
                            <label>
                                Medication:
                                <input type="text" value={this.state.medication.toString()} name="medication" />
                            </label> */}
                                {/* <input type="submit" value="Submit" /> */}
                            </form>
                        </div>
                    </div>

                    <div className="col-6 ">
                        <h5 className='heading'>Identified entities</h5>
                        <div className='output-display rounded'>
                            <code> {this.state.entities.toString()}</code>
                        </div>
                    </div>
                </div>

            </Container>
        );
    }
}