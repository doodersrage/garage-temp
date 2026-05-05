import { useState } from "preact/hooks";

export default function Form() {
        const [responseMessage, setResponseMessage] = useState("");

        async function submit(e: SubmitEvent) {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const response = await fetch("/api/contact", {
            method: "POST",
            body: formData,
        });
        const data = await response.json();
        if (data.message) {
            setResponseMessage(data.message);
        }
    }

    return (
        <form onSubmit={submit}>
            <div>
                <label class="block text-black-700 text-sm font-bold mb-2" for="name">
                Name<sup>*</sup>
            </label>
                <input class="bg-gray-200 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" name="name" placeholder="Name" />
            </div>
            <div>
                <label class="block text-black-700 text-sm font-bold mb-2" for="email">
                Email<sup>*</sup>
            </label>
                <input class="bg-gray-200 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="email" name="email" placeholder="Email" />
            </div>
            <div>
                <label class="block text-black-700 text-sm font-bold mb-2" for="message">
                Message<sup>*</sup>
            </label>
                <textarea class="bg-gray-200 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" name="message" placeholder="Message"></textarea>
            </div>
            <div>
                <input class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="submit" value="Send" />
            </div>
            {responseMessage && <p>{responseMessage}</p>}
        </form>
    );
}