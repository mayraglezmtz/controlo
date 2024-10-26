/// Verificamos si el navegador soporta la API de Reconocimiento de Voz
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

// Configuraciones del reconocimiento de voz
recognition.continuous = false;
recognition.interimResults = false;
recognition.lang = 'es-ES'; // Configura el idioma en español

// Selecciona los elementos de los íconos
const micIcon = document.getElementById("mic-icon");
const tecladoIcon = document.getElementById("teclado-icon");
const camaraIcon = document.getElementById("camara-icon");
const sendButton = document.getElementById("send-btn");
const chatInput = document.querySelector(".chat-input textarea");
const chatbox = document.querySelector(".chatbox");
const divTeclado = document.querySelector(".div-teclado"); // Selección de .div-teclado



// Alternar el estado del micrófono (rojo cuando está activo)
micIcon.addEventListener("click", () => {
  micIcon.classList.toggle("active");

  if (micIcon.classList.contains("active")) {
    recognition.start(); // Start voice recognition
  } else {
    recognition.stop(); // Stop voice recognition
  }
});

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  chatInput.value = transcript; // Populate input area with recognized text
};

recognition.onerror = (event) => {
  console.error("Error en el reconocimiento de voz: ", event.error);
  alert("Hubo un error al reconocer el audio. Por favor, intenta nuevamente.");
  micIcon.classList.remove("active"); 
};

recognition.onend = () => {
  micIcon.classList.remove("active"); 
};

// Evento para enviar mensajes con el botón de enviar
sendButton.addEventListener("click", sendMessage);

// También permite enviar el mensaje con la tecla 'Enter'
chatInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault(); 
    sendMessage();
  }
});


// Function to handle product search and display results in the chatbot
function searchProduct(productName) {
  fetch("http://localhost:5000/search_product", {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ product_name: productName })
  })
  .then(response => response.json())
  .then(data => {
      const message = data.result || data.error;
      appendMessage("incoming", message);
      
      // If product found, prompt for quantity
      if (!data.error) {
          const match = message.match(/The "(.*)" costs "(\d+\.\d+)" and there are "(\d+)" units/);
          if (match) {
              currentProduct = {
                  name: match[1],
                  price: parseFloat(match[2]),
                  stock: parseInt(match[3])
              };
              appendMessage("incoming", `How many units of ${currentProduct.name} would the client like to buy?`);
          }
      }
  })
  .catch(error => {
      console.error("Error fetching product data:", error);
      appendMessage("incoming", "Error connecting to the server.");
  });
}

// Function to add message to chatbox
function appendMessage(type, text) {
  const messageElement = document.createElement("li");
  messageElement.classList.add("chat", type);

  const icon = document.createElement("span");
  icon.classList.add("material-symbols-outlined");
  icon.textContent = type === "outgoing" ? "person" : "smart_toy";

  const messageText = document.createElement("p");
  messageText.textContent = text;

  messageElement.appendChild(icon);
  messageElement.appendChild(messageText);
  chatbox.appendChild(messageElement);

  chatbox.scrollTop = chatbox.scrollHeight;
}

// Generate responses for general queries
function generateResponse(message) {
  message = message.toLowerCase();

  if (message.includes("repartidor")) {
    return "¿Necesitas información sobre un proveedor específico?";
  } else if (message.includes("inventario")) {
    return "Estoy revisando el estado de tu inventario.";
  } else if (message.includes("ok")) {
    return "¡Genial! Si necesitas más ayuda, solo dímelo.";
  } else {
    return "Estoy aquí para ayudarte. ¿Tienes alguna otra pregunta?";
  }
}


// Function to send sale data to the backend for inventory update NEW NEW
function finalizeSale() {
  fetch("http://localhost:5000/update_inventory", {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ sale_data: saleItems })
  })
  .then(response => response.json())
  .then(data => {
      if (data.status) {
          appendMessage("incoming", data.status); // Show success message
      } else {
          appendMessage("incoming", data.error); // Show any error message
      }
  })
  .catch(error => {
      console.error("Error updating inventory:", error);
      appendMessage("incoming", "Error updating inventory in the server.");
  });
}

// Variables for tracking modes
let inClientMode = false;
let inRestockMode = false;
let inPriceUpdateMode = false; // New variable for price update mode
let currentProduct = "";
let subtotal = 0;
let saleItems = [];
let restockProduct = "";
let restockItems = [];

// Modify sendMessage function to handle all modes
function sendMessage() {
  const message = chatInput.value.trim();
  if (message === "") return; 

  appendMessage("outgoing", message);
  chatInput.value = ""; 

  if (inPriceUpdateMode) {
      handlePriceUpdateMode(message); 
  } else if (inRestockMode) {
      handleRestockMode(message); 
  } else if (inClientMode) {
      handleClientMode(message); 
  } else {
      if (message.toLowerCase().includes("cliente")) {
          inClientMode = true;
          inRestockMode = false;
          inPriceUpdateMode = false;
          subtotal = 0;
          saleItems = [];
          appendMessage("incoming", "Cliente detected. Please enter the product name to sell.");
      } else if (message.toLowerCase().includes("repartidor") || message.toLowerCase().includes("repartidores")) {
          inRestockMode = true;
          inClientMode = false;
          inPriceUpdateMode = false;
          restockItems = [];
          appendMessage("incoming", "Repartidor detected. Please enter the product name to restock.");
      } else {
          const response = generateResponse(message);
          setTimeout(() => {
              appendMessage("incoming", response);
          }, 500);
      }
  }
}


// Function to handle client mode inputs (sale process)
function handleClientMode(message) {
  if (["listo", "ready", "ya", "no"].includes(message.toLowerCase())) {
      inClientMode = false;
      appendMessage("incoming", `Sale complete. Total: $${subtotal.toFixed(2)}`);
      finalizeSale(); // Send sale data to the backend for inventory update
  } else if (currentProduct) {
      // Handle quantity entry
      const quantity = parseInt(message);
      if (isNaN(quantity) || quantity <= 0) {
          appendMessage("incoming", "Please enter a valid quantity.");
      } else {
          const itemTotal = currentProduct.price * quantity;
          subtotal += itemTotal;
          saleItems.push({ name: currentProduct.name, quantity: quantity });
          appendMessage("incoming", `${quantity} units added. Subtotal: $${subtotal.toFixed(2)}.`);
          currentProduct = "";
          appendMessage("incoming", "Please enter another product name, or type 'listo' to finish.");
      }
  } else {
      searchProduct(message);
  }
}


// Function to handle product search for restock mode
function restockProductSearch(productName) {
  fetch("http://localhost:5000/search_product", {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ product_name: productName })
  })
  .then(response => response.json())
  .then(data => {
      const message = data.result || data.error;
      appendMessage("incoming", message);

      if (!data.error) {
          const match = message.match(/The "(.*)" costs/);
          if (match) {
              restockProduct = { name: match[1] };
              appendMessage("incoming", `Is "${restockProduct.name}" the correct product? Type 'yes' to confirm or re-enter the product name.`);
          }
      }
  })
  .catch(error => {
      console.error("Error fetching product data:", error);
      appendMessage("incoming", "Error connecting to the server.");
  });
}



// Function to handle restock mode inputs
function handleRestockMode(message) {
  if (["listo", "ready", "ya", "no"].includes(message.toLowerCase())) {
      inRestockMode = false;
      finalizeRestock();
      appendMessage("incoming", "Restock complete. Would you like to update any prices? Type 'yes' or 'no'.");

      // Activate price update mode prompt
      inPriceUpdateMode = true;
  } else if (restockProduct && message.toLowerCase() === "yes") {
      appendMessage("incoming", `How many units of ${restockProduct.name} are you adding to inventory?`);
  } else if (restockProduct && !isNaN(parseInt(message))) {
      const quantityAdded = parseInt(message);
      restockItems.push({ name: restockProduct.name, quantity: quantityAdded });
      appendMessage("incoming", `${quantityAdded} units of ${restockProduct.name} added. Enter another product name or type 'listo' to finish.`);
      restockProduct = "";
  } else {
      restockProductSearch(message);
  }
}


// Function to finalize restock and send data to the backend
function finalizeRestock() {
  fetch("http://localhost:5000/restock_inventory", {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ restock_data: restockItems })
  })
  .then(response => response.json())
  .then(data => {
      if (data.status) {
          appendMessage("incoming", data.status); // Show success message
      } else {
          appendMessage("incoming", data.error); // Show any error message
      }
  })
  .catch(error => {
      console.error("Error updating inventory:", error);
      appendMessage("incoming", "Error updating inventory in the server.");
  });
}


// Function to handle price update mode inputs
function handlePriceUpdateMode(message) {
  // Check for exit commands first
  if (message.toLowerCase() === "no") {
      inPriceUpdateMode = false;
      appendMessage("incoming", "Price update mode ended.");
      return; // Exit early
  } else if (message.toLowerCase() === "listo") {
      inPriceUpdateMode = false;
      appendMessage("incoming", "Price updates complete.");
      return; // Exit early
  }

  // If we're waiting for a product name
  if (!currentProduct) {
      searchProductForPriceUpdate(message);
  } 
  // If a product name was found, we're now waiting for a new price
  else if (currentProduct && !isNaN(parseFloat(message))) {
      const newPrice = parseFloat(message);
      updateProductPrice(currentProduct, newPrice);
      appendMessage("incoming", `The price of ${currentProduct} has been updated to $${newPrice}. Enter another product name or type 'listo' to finish.`);
      
      // Reset currentProduct for the next product update
      currentProduct = "";
  } else {
      // This message prompts the user to enter a valid product or price when necessary
      appendMessage("incoming", "Please enter a valid product name or type 'no' to exit.");
  }
}



// Function to search for a product before updating its price
function searchProductForPriceUpdate(productName) {
  fetch("http://localhost:5000/search_product", {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ product_name: productName })
  })
  .then(response => response.json())
  .then(data => {
      const message = data.result || data.error;
      appendMessage("incoming", message);

      if (!data.error) {
          const match = message.match(/The "(.*)" costs/);
          if (match) {
              currentProduct = match[1];
              appendMessage("incoming", `Please enter the new price for "${currentProduct}".`);
          }
      }
  })
  .catch(error => {
      console.error("Error fetching product data:", error);
      appendMessage("incoming", "Error connecting to the server.");
  });
}




// Function to update product price in the backend
function updateProductPrice(productName, newPrice) {
  fetch("http://localhost:5000/update_price", {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ product_name: productName, new_price: newPrice })
  })
  .then(response => response.json())
  .then(data => {
      if (data.status) {
          appendMessage("incoming", data.status);
      } else {
          appendMessage("incoming", data.error);
      }
  })
  .catch(error => {
      console.error("Error updating price:", error);
      appendMessage("incoming", "Error updating price in the server.");
  });
}