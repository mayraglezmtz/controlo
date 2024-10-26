from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image
import io
import base64
import pandas as pd
import apibarras

app = Flask(__name__)
CORS(app)

# Load the inventory data
file_path = 'inventario.csv'
inventario_df = pd.read_csv(file_path)

def search_product_formatted(product_name):
    result = inventario_df[inventario_df['nombre'].str.contains(product_name, case=False, na=False)]
    if not result.empty:
        row = result.iloc[0]
        return f'The "{row["nombre"]}" costs "{row["precio_unitario"]}" and there are "{row["cantidad_unidades"]}" units in stock.'
    else:
        return "Product not found."

@app.route('/search_product', methods=['POST'])
def search_product():
    data = request.json
    product_name = data.get("product_name", "")
    
    if product_name:
        result = search_product_formatted(product_name)
        return jsonify({"result": result})
    else:
        return jsonify({"error": "No product name provided"}), 400

# New route to update the inventory after a sale
@app.route('/update_inventory', methods=['POST'])
def update_inventory():
    sale_data = request.json.get("sale_data", [])
    global inventario_df  # Modify the global DataFrame

    # Print received sale data for debugging
    print("Received sale data:", sale_data)

    # Process each item in the sale data and reduce quantity in inventory
    for item in sale_data:
        product_name = item.get('name')
        quantity_sold = item.get('quantity')

        if product_name is None or quantity_sold is None:
            print("Invalid item structure:", item)
            return jsonify({"error": "Invalid item structure received"}), 400

        # Find the product in the DataFrame
        product_index = inventario_df[inventario_df['nombre'].str.contains(product_name, case=False, na=False)].index
        if not product_index.empty:
            idx = product_index[0]
            current_stock = inventario_df.at[idx, 'cantidad_unidades']

            # Update stock if there is enough
            if current_stock >= quantity_sold:
                inventario_df.at[idx, 'cantidad_unidades'] = current_stock - quantity_sold
                print(f"Updated {product_name}: New stock = {inventario_df.at[idx, 'cantidad_unidades']}")
            else:
                error_msg = f"Not enough stock for {product_name} (Requested: {quantity_sold}, Available: {current_stock})"
                print(error_msg)
                return jsonify({"error": error_msg}), 400
        else:
            error_msg = f"Product {product_name} not found in inventory."
            print(error_msg)
            return jsonify({"error": error_msg}), 400

    # Save the updated inventory back to the CSV file
    try:
        inventario_df.to_csv(file_path, index=False)
        print("Inventory updated successfully")
        return jsonify({"status": "Inventory updated successfully"})
    except Exception as e:
        print("Error saving to CSV:", str(e))
        return jsonify({"error": "Error saving to CSV file"}), 500

@app.route('/restock_inventory', methods=['POST'])
def restock_inventory():
    restock_data = request.json.get("restock_data", [])
    global inventario_df  # Modify the global DataFrame

    print("Received restock data:", restock_data)  # Debugging print

    for item in restock_data:
        product_name = item.get('name')
        quantity_added = item.get('quantity')

        if product_name is None or quantity_added is None:
            print("Invalid item structure:", item)
            return jsonify({"error": "Invalid item structure received"}), 400

        # Find the product in the DataFrame
        product_index = inventario_df[inventario_df['nombre'].str.contains(product_name, case=False, na=False)].index
        if not product_index.empty:
            idx = product_index[0]
            current_stock = inventario_df.at[idx, 'cantidad_unidades']

            # Update stock by adding the new quantity
            inventario_df.at[idx, 'cantidad_unidades'] = current_stock + quantity_added
            print(f"Restocked {product_name}: New stock = {inventario_df.at[idx, 'cantidad_unidades']}")
        else:
            error_msg = f"Product {product_name} not found in inventory."
            print(error_msg)
            return jsonify({"error": error_msg}), 400

    # Save the updated inventory back to the CSV file
    try:
        inventario_df.to_csv(file_path, index=False)
        print("Inventory restocked successfully")
        return jsonify({"status": "Inventory restocked successfully"})
    except Exception as e:
        print("Error saving to CSV:", str(e))
        return jsonify({"error": "Error saving to CSV file"}), 500

@app.route('/update_price', methods=['POST'])
def update_price():
    data = request.json
    product_name = data.get("product_name")
    new_price = data.get("new_price")

    if product_name is None or new_price is None:
        return jsonify({"error": "Product name or new price missing"}), 400

    # Find the product in the DataFrame
    product_index = inventario_df[inventario_df['nombre'].str.contains(product_name, case=False, na=False)].index
    if not product_index.empty:
        idx = product_index[0]
        inventario_df.at[idx, 'precio_unitario'] = new_price
        try:
            inventario_df.to_csv(file_path, index=False)
            return jsonify({"status": f"Price of {product_name} updated successfully to ${new_price}."})
        except Exception as e:
            return jsonify({"error": "Error saving price update to CSV file"}), 500
    else:
        return jsonify({"error": f"Product {product_name} not found in inventory."}), 400



if __name__ == "__main__":
    app.run(debug=True)
