import { EventBuilder } from "vimcord";

export default new EventBuilder({
    event: "clientReady",
    name: "Ready.Hello",

    async execute(client) {
        console.log("Hello world!");
    }
});
