import { EventBuilder } from "vimcord";

export default new EventBuilder({
    event: "ready",
    name: "Ready.Hello",

    async execute(client) {
        console.log("Hello world!");
    }
});
