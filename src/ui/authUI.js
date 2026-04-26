export function bindLoginForm(controller) {
    const form = document.getElementById("adminLoginForm");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const pass = document.getElementById("password").value;

        await controller.login(email, pass);
    });
}