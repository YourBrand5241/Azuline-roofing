// ==== CONFIG ====
const SUPABASE_URL = "https://jywhymtctdnvwwvxtcpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8-VfhsJiclZMwjjkZ-k18A_gLYKbaGR";
const BUSINESS_ID = "azuline-roofing";
const BUSINESS_NAME = "Azuline Roofing Solutions";

const EMAILJS_SERVICE_ID = "service_yj4mxr6";
const EMAILJS_TEMPLATE_ID = "template_khedkjr";
const EMAILJS_PUBLIC_KEY = "fs6q7ZsiYGhRUtas5";
const OWNER_EMAIL = "sales@azuline.co.uk";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
if (window.emailjs) emailjs.init(EMAILJS_PUBLIC_KEY);

document.getElementById("quote-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("q-name").value.trim();
  const phone = document.getElementById("q-phone").value.trim();
  const email = document.getElementById("q-email").value.trim();
  const address = document.getElementById("q-address").value.trim();
  const service = document.getElementById("q-service").value;
  const details = document.getElementById("q-details").value.trim();
  const message = document.getElementById("quote-message");
  const submitBtn = document.getElementById("quote-submit-btn");

  if (!name || !phone || !email) {
    message.textContent = "Please fill in your name, phone, and email.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";

  const { error } = await supabaseClient.from("quote_requests").insert({
    business_id: BUSINESS_ID,
    customer_name: name,
    customer_phone: phone,
    customer_email: email,
    property_address: address,
    service_type: service,
    details: details,
  });

  if (error) {
    message.textContent = "Something went wrong — please try again.";
    console.error(error);
    submitBtn.disabled = false;
    submitBtn.textContent = "Send Enquiry";
    return;
  }

  if (window.emailjs) {
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: email,
      to_name: name,
      business_name: BUSINESS_NAME,
      email_subject: `Enquiry received — ${BUSINESS_NAME}`,
      email_body: `Thanks for getting in touch with ${BUSINESS_NAME}.\n\nWe've received your enquiry:\n${service ? service : "General enquiry"}\n${details ? details : ""}\n\nWe'll be in touch shortly to discuss your roof.`,
    }).catch(err => console.error("Confirmation email failed to send:", err));

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: OWNER_EMAIL,
      to_name: BUSINESS_NAME,
      business_name: BUSINESS_NAME,
      email_subject: `New quote request — ${service || "General enquiry"}`,
      email_body: `New quote request received.\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nAddress: ${address || "Not given"}\nService: ${service || "Not specified"}\nDetails: ${details || "None given"}`,
    }).catch(err => console.error("Owner notification email failed to send:", err));
  }

  document.getElementById("confirmation-overlay").classList.remove("hidden");
  document.getElementById("quote-form").reset();
  message.textContent = "";
  submitBtn.disabled = false;
  submitBtn.textContent = "Send Enquiry";
});

document.getElementById("close-overlay").addEventListener("click", () => {
  document.getElementById("confirmation-overlay").classList.add("hidden");
});
