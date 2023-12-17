process.stdin.setEncoding("utf8");

const http = require('http');
const path = require("path");
const express = require("express");
const app = express(); 
const bodyParser = require("body-parser");
const axios = require('axios');

app.set("views", path.resolve(__dirname, "templates"));
app.use(express.static(__dirname + '/additional_css'));
app.set("view engine", "ejs");

require("dotenv").config({ path: path.resolve(__dirname, '.env') }) 

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;

const data_base = process.env.MONGO_DB_NAME;
const collect_tion = process.env.MONGO_COLLECTION;

const uri = `mongodb+srv://${userName}:${password}@cluster0.aigqdui.mongodb.net/?retryWrites=true&w=majority`;

const { MongoClient, ServerApiVersion } = require('mongodb');
const { Console } = require('console');

const databaseAndCollection = {db: data_base, collection: collect_tion};

const portNumber = process.argv[2];
app.listen(portNumber);

console.log(`Web server started and running at http://localhost:${portNumber}`);
const prompt = "Stop to shutdown the server:";
process.stdout.write(prompt);

process.stdin.on("readable", () => { 
	let dataInput = process.stdin.read();
	if (dataInput !== null) {
        let command = dataInput.trim();
		if (command === "stop") {
			console.log("Shutting down the server");
            process.exit(0);  
        }
        else{
            console.log(`Invalid command: ${command}`);
        }
        process.stdout.write(prompt);
        process.stdin.resume();
    }
});

async function getPokemon(pokemonName) {
    try {
      const pokemonResponse = await axios.get(`https://ex.traction.one/pokedex/pokemon/${pokemonName}`, {
        headers: {
          'User-Agent': 'BastionDiscordBot (https://bastion.traction.one, v10.13.0)'
        }
      });
  
      console.log(pokemonResponse.data[0]);
      return pokemonResponse.data[0];
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

app.use('/additional_css/', express.static('./additional_css'));

app.use(bodyParser.urlencoded({extended:false}));

//starting page
app.get("/", (request, response) => { 
    response.render("index");
});

//get the info
app.get("/user", (request, response) => { 
    response.render("user");
});

//entering the username and pokemon into the database
app.post("/user", async (request, response) => {
    let username = request.body.username;
    let favoritePokemon = request.body.favoritePokemon;

    let app = {
        username : username,
        favoritePokemon : favoritePokemon
    }

    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(app);
    } catch(e) {
       // console.log("Error heere");
        console.error(e);
    } finally {
        await client.close();
    }

    const variables = {
        username : username,
        favoritePokemon : favoritePokemon
    }
    response.render("user", variables);
});

//to search
app.get("/form", (request, response) => {
    
    response.render("form");
});

//result
app.post("/form", async (request, response) => {
    let username = request.body.username;

    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

    let table_pokemon = "<table border = \"1\"";
    table_pokemon = table_pokemon + "<tr><th>UserName</th><th>Favorite Pokemon</th><th>Image</th></tr>";

    try {
        await client.connect();
        let filter = { username: { $eq: username }};
        const cursor = await client.db(databaseAndCollection.db)
                                  .collection(databaseAndCollection.collection)
                                  .find(filter);
        
        const result = await cursor.toArray();

        if(result) {
            for (const value of result) {
                try {
                    
                    const pokemonResponse = await getPokemon(value.favoritePokemon);
                    const pokemonImageUrl = pokemonResponse.sprite


                    table_pokemon += `<tr>
                                        <td>${value.username}</td>
                                        <td>${value.favoritePokemon}</td>
                                        <td><img src="${pokemonImageUrl}" alt="Pokemon Image"/></td>
                                      </tr>`;
                } catch (pokeApiError) {
                    console.error('Error fetching from PokeAPI:', pokeApiError);
                    // Handle the error (maybe set a default image or skip adding the image)
                }                
            }
            table_pokemon += "</table>";

            const variables = {
                table_pokemon: table_pokemon
            };
            response.render("table_pokemon", variables);
        }
        else {            
            console.log(`Application not found for userName ${username}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

});


app.get("/search", (request, response) => { 
    response.render("search");
});

app.post("/search", async (request, response) => { 
    console.log(request.body.pokemon);

    try {
        const pokemonResponse = await getPokemon(request.body.pokemon); 

        const variables = {
            pokemonDetails: {
                name: pokemonResponse.name,
                pokedexNumber: pokemonResponse.number,
                types: pokemonResponse.types,
                species: pokemonResponse.species,
                height: pokemonResponse.height,
                weight: pokemonResponse.weight,
                imageUrl: pokemonResponse.sprite 
            }
        };

        response.render("details", variables);
    } catch (error) {
        console.error('Error fetching Pokemon data:', error);
        response.status(500).send("Error fetching Pokemon data");
    }
});


