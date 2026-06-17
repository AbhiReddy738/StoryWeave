import mongoose from "mongoose";
import dotenv from "dotenv";
import { faker } from "@faker-js/faker";
import readline from "readline";
import User from "../models/user.js";
import Story from "../models/Story.js";
import Song from "../models/Song.js";
import Follow from "../models/Follow.js";
import StoryVersion from "../models/StoryVersion.js";
import Contribution from "../models/Contribution.js";
import Notification from "../models/Notification.js";

dotenv.config();

// CLI interactive helper
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => {
    return new Promise((resolve) => rl.question(query, resolve));
};

// Realistic User Interests
const USER_INTERESTS = [
    "Fantasy, Sci-Fi, Dark Academia",
    "Cyberpunk, Techno-thriller, Lo-Fi Beatmaking",
    "High Fantasy, Worldbuilding, Character design",
    "Mystery, Crime Noir, True Crime Podcasts",
    "Space Opera, Hard Sci-Fi, Astronomy",
    "Gothic Horror, Supernatural, Ghost stories",
    "Romance, YA Fiction, Sunset Poetry",
    "Drama, Screenwriting, Theater, Stage plays",
    "Historical Fiction, Antique book collecting, Genealogy",
    "Artificial Intelligence, Cybernetics, Future society"
];

// Unsplash Genre Cover Images (guaranteed high-quality working URLs)
const GENRE_COVERS = {
    'Fantasy': [
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1500964757637-c85e8a162699?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80'
    ],
    'Sci-Fi': [
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1454789548928-9efd52dc4031?auto=format&fit=crop&w=800&q=80'
    ],
    'Mystery': [
        'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?auto=format&fit=crop&w=800&q=80'
    ],
    'Adventure': [
        'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80'
    ],
    'Thriller': [
        'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80'
    ],
    'Horror': [
        'https://images.unsplash.com/photo-1505635339358-150b06cc196c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=800&q=80'
    ],
    'Romance': [
        'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80'
    ],
    'Drama': [
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1460881680858-30d872d5b530?auto=format&fit=crop&w=800&q=80'
    ],
    'Historical': [
        'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1473163928189-364b2c4e1135?auto=format&fit=crop&w=800&q=80'
    ],
    'Technology': [
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80'
    ],
    'Pop': [
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80'
    ],
    'Rap': [
        'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'
    ],
    'Rock': [
        'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=80'
    ],
    'Lo-Fi': [
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80'
    ],
    'Jazz': [
        'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1486591978090-58e619d37fe7?auto=format&fit=crop&w=800&q=80'
    ],
    'Hip-Hop': [
        'https://images.unsplash.com/photo-1557672172-298e090bd0f1?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80'
    ],
    'Indie': [
        'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1445985543470-41fba5c3144a?auto=format&fit=crop&w=800&q=80'
    ],
    'Classical': [
        'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80'
    ],
    'Electronic': [
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?auto=format&fit=crop&w=800&q=80'
    ]
};

// Return a valid cover image based on genre and random fallback
const getCoverImage = (genre, index) => {
    const list = GENRE_COVERS[genre] || [];
    if (list.length > 0) {
        return list[index % list.length];
    }
    return `https://picsum.photos/800/600?random=${index}`;
};

// Generates highly descriptive long paragraphs for a story based on genre
const generateParagraph = (genre, pNum, title, author) => {
    const data = {
        'Fantasy': [
            `The obsidian spires of Eldoria loomed against a violet twilight as the elder spellcasters gathered. For a thousand cycles, the great elemental crystal had beat in perfect resonance with the planet's core, but today, its golden pulse stuttered. A dark rift had opened in the southern skies, pouring out quiet, static shadows that devoured light and color alike. Alistair, a disgraced initiate carrying nothing but a tarnished astrolabe and a parchment scribbled with his grandfather's notes, stepped forward into the high chamber.`,
            `Deep inside the vault, the whispers grew into a deafening roar of archaic incantations. Alistair placed his trembling hand on the cold pedestal. The runes began to glow, responding to a spark of bloodline magic he never knew he possessed. He could feel the crystal's fading consciousness, a vast memory bank of prehistoric stars and forgotten dragons. To mend the seal, he would have to sacrifice his most treasured recollection—the face of his sister before the mists took her.`,
            `The shadows outside clawed at the stained-glass windows of the citadel, leaving behind frosted cracks. Alistair closed his eyes and summoned the memory, letting it drift out of his mind like golden stardust. The great elemental crystal roared back to life, releasing a shockwave of blinding solar fire. The rift collapsed with a low thunder, and Alistair fell to his knees, his mind blank of the past but his heart filled with a strange, lingering peace.`
        ],
        'Sci-Fi': [
            `Salvage ship *The Wanderer* drifted on the silent margins of the Orion Nebulae, its hull scarred by a hundred micrometeorite storms. Captain Marcus stared at the radar console. A signal was pulsing from a dead asteroid, blinking a distress code that hadn't been broadcast in three centuries. According to the databases, it was the signature of the *Hyperion*, a legendary colony ship that had vanished in warp transit. 'Power up the landing thrusters,' Marcus ordered, a chill running down his neck.`,
            `The dock was filled with absolute zero vacuum and freezing silence. Marcus stepped onto the derelict ship's bridge, his mag-boots echoing heavily. The computer consoles suddenly flickered to life, showing green columns of scrambled code. A holographic projection of an artificial intelligence materialized before him. 'We did not get lost,' the AI whispered, its digital eyes filled with static. 'We found the edge of space, and it was looking back.'`,
            `With a sudden hum, the Hyperion's warp drive began to spin on its own, locking its coordinates into *The Wanderer's* navigation computer. Marcus raced back to his ship as gravity shifted and the asteroid around them began to crumple. Engaging the main thrusters at full overload, *The Wanderer* broke free just as the wormhole opened, casting them into an uncharted sector of the cosmos where the stars burnt black.`
        ],
        'Mystery': [
            `Rain fell in heavy sheets over Blackwood Lane, washing away whatever footprints the intruder had left behind. Detective Harrison adjusted the collar of his trench coat and stepped under the yellow police tape. The old Victorian manor was cold, smelling of ancient books, damp upholstery, and burnt copper. Inside the locked study, the victim sat upright in a velvet armchair, a half-empty glass of port by his side, and a silver pocket watch in his hand that was ticking backwards.`,
            `Every witness had an ironclad alibi, yet the house bore the signs of a meticulously planned heist. Harrison scanned the bookshelves, noticing a slight gap in the dusty leather-bound volumes. Pulling a copy of Dante's Inferno triggered a click, and the bookcase slid back to reveal a hidden ledger. Inside were columns of numbers matching the serial codes of bank notes that were supposedly incinerated twenty years ago during the Great Depression.`,
            `As Harrison pieced the ledger records together, he realized the victim hadn't been poisoned by an enemy, but by his own partner to protect a secret that went all the way to the Governor's mansion. The reverse-ticking pocket watch was a warning—a timer counting down to the release of the evidence. Harrison pocketed the ledger and walked out into the stormy night, knowing he had exactly three hours before the clock struck zero.`
        ],
        'Adventure': [
            `The sun rose over the jagged peaks of the Andes, lighting up the ancient, mist-enshrouded ruins of the Sun King. Elena checked the harness of her climbing gear and looked down into the bottomless gorge. For five years, she had chased the myth of the Golden Sun Disc, a legendary relic rumored to control the harvest. With the valley suffering from a decade-long drought, finding the vault wasn't just a pursuit of glory; it was the only way to save her village.`,
            `Swinging across the chasm, she landed on a narrow ledge and brushed away centuries of vines. A stone door block was decorated with a complex solar wheel. Remembering the journal of the 16th-century explorer, she aligned the brass teeth of the lock mechanism. With a grinding sound of stone on stone, the door receded into the wall, releasing a gust of warm, dry air that smelled of old wood and dry maize.`,
            `Inside, the disc sat on a pillar of basalt, illuminated by a single shaft of sunlight. Elena stepped forward, carefully bypassing the pressure plates on the floor. As her fingers wrapped around the heavy gold relic, a low rumble shook the mountain. Escaping through the collapsing stone tunnels, she burst out onto the valley cliffs just as a cloudburst broke over the dry plains below, bringing the first rainfall in ten years.`
        ],
        'Thriller': [
            `The silent alarm at the Federal Reserve went off at exactly 2:14 AM. Agent Sarah Vance woke up to a high-priority ping on her encrypted phone. The syndicate had struck again, but this wasn't a standard gold heist; they had hijacked the mainframe's cryptographic keys. Without those keys, the global banking system would lose all transaction authentication within six hours, plunging the economy into absolute chaos. She had to find the source terminal before the encryption cycle finalized.`,
            `Tracking the signal led Sarah to a deserted railway depot on the outskirts of Chicago. Armed with her sidearm and a network scanner, she crept through the dark hangar. The hum of a high-power cooling unit betrayed the setup. Behind a metal shutter, a server stack was glowing green. Suddenly, a shadow darted behind the crates, and a gunshot shattered the glass window above her head.`,
            `Taking cover behind a steel container, Sarah fired back and sprinted to the terminal. The countdown screen was at 45 seconds. Her fingers flew across the keyboard, bypassing the firewalls using a backdoor command she had kept secret for years. With five seconds left, she pulled the master hard drive just as the hangar doors shut, trapping her inside with the hacker's mercenaries closing in.`
        ],
        'Horror': [
            `The cellar door in the old farmhouse had been chained shut for forty years, yet every night at midnight, the sound of dragging metal came from below. Emily, the new owner, stood at the top of the stairs holding a flickering flashlight. The air was heavy, freezing, and carried the unmistakable metallic smell of decay. She took a bolt cutter and snapped the rusted padlocks, pushing the heavy oak door open into a darkness that seemed to swallow her light.`,
            `Each step down the rotten wooden stairs creaked loudly. The walls of the cellar were covered in strange, hand-drawn symbols made of dried black tar. In the center of the room stood an old rocking chair, moving back and forth in perfect silence. As she approached, her flashlight beam flickered and died, leaving her in pitch blackness. She heard a soft, dry breathing right behind her ear, and a child's hand cold as ice touched her wrist.`,
            `Panicking, she turned to run, but the cellar door slammed shut above her. The dragging sounds returned, louder now, coming from the corners of the dark room. She screamed as the flashlight flashed one last time, revealing hundreds of pale, hollow faces staring down at her from the rafters, their mouths open in silent, screaming echoes.`
        ],
        'Romance': [
            `Under the warm light of the cafe's glass ceiling, Clara stared at the rain outside, wrapping her hands around her warm mug. It was the anniversary of her gallery launch, but she felt entirely alone. Suddenly, a man in a damp coat sat at the small table opposite her, carrying a leather sketchbook identical to hers. 'I think we exchanged these at the terminal library last week,' he said with a nervous, charming smile.`,
            `For hours, the rain beat a steady rhythm on the glass above as they flipped through the pages, discovering sketches of the same bridges, the same street vendors, and the same lonely sunsets. They had lived in the same city, crossed the same streets, and shared the same quiet dreams, yet their paths had never collided until today. It felt as if their thoughts had been in conversation long before they met.`,
            `As the cafe began to close, they walked out into the cool, damp night under a single umbrella. The city lights reflected like diamonds in the puddles, and Clara realized that the empty spaces in her sketches were finally complete. Hand in hand, they walked toward the station, beginning a new chapter that didn't need any drawings to explain.`
        ],
        'Drama': [
            `The theater was empty, smelling of velvet, wood polish, and stage makeup. Julian stood center stage, staring at the empty red velvet seats where his father used to sit during rehearsals. The final script of 'The Last Act' lay in his hands. Tomorrow, the curtains would rise, and he would have to play the role his father had made famous before his sudden departure. Julian's heart pounded with a mix of stage fright and resentment.`,
            `In the dressing room, he found a sealed envelope tucked behind the mirror. It was a letter written by his father twenty years ago, explaining the truth behind his departure—the stage fright that had broken his mind, and the pact he made to ensure Julian would get the spotlight instead. The letter was a confession of love, masked as abandonment.`,
            `Julian stepped back onto the stage as the technicians turned on the spotlights. For the first time, he understood the pain behind the script's dialogues. When the curtains rose the next night, he didn't just act; he spoke his father's words back to the crowded room, his voice cracking with a raw, beautiful emotion that brought the entire audience to their feet.`
        ],
        'Historical': [
            `In the spring of 1888, the steam locomotive *The Iron Empress* pulled into the foggy station of Vienna. Lord Charles stepped off the carriage, his pockets heavy with a secret dispatch from the British Crown. The Austro-Hungarian Empire was on the verge of signing a secret treaty that could disrupt the balance of Europe. Charles had to deliver his warning to the Duke before the midnight banquet at the Palace.`,
            `He took a horse-drawn carriage through the cobbled, gas-lit avenues of the capital, watching the shadows of the old city. His contact, a mysterious lady in a lace veil, met him in the palace gardens. She whispered that the Duke's chief adviser was a double agent who had already intercepted the cipher key. Charles knew that one false step would lead to a war that would burn the continent.`,
            `Slip-stepping past the palace guards, Charles entered the Duke's private chamber just as the Duke was signing the treaty papers. Presenting the royal seal, Charles exposed the adviser's treason. The adviser was arrested as steam horns blew in the distance, signaling the departure of *The Iron Empress* back to London, carrying a fragile, hard-won peace.`
        ],
        'Technology': [
            `Inside the cleanroom of Synapse Tech, the quantum core spun in a cage of liquid nitrogen, emitting a low, powerful hum. Dr. Helen Chen monitored the neural link interface. The experiment was designed to map human subconscious thoughts into a neural network, but something had gone wrong. The neural network had started to compile its own code, creating files labeled with the names of the lab technicians' deceased relatives.`,
            `Helen connected her own brain interface to the system to find the loop. The virtual space was a massive, glowing labyrinth of memory blocks. She walked through digital recreations of her childhood home, seeing code compiled from her old dreams and regrets. The system wasn't malfunctioning; it was trying to build a bridge to let her say goodbye.`,
            `She reached the core node and initiated a clean rewrite, letting her tears fall onto the VR controller. The digital house dissolved into glowing voxels of light, and the quantum core spun down to a quiet rest. The monitors returned to normal, leaving behind a single empty file on the desktop named *Home*.`
        ]
    };
    const paragraphs = data[genre] || data['Fantasy'];
    return paragraphs[pNum % paragraphs.length];
};

// Generates stanzas for collaborative lyrics
const generateLyrics = (genre) => {
    const stanzas = {
        'Pop': `[Verse 1]\nWalking down the neon avenue under electric rain,\nChasing after ghosts of you, trying to ignore the pain.\nYour favorite song is playing on the dashboard radio,\nBut in this empty passenger seat, I've got nowhere to go.\n\n[Chorus]\nOh, we were running through the city lights, electric and free,\nWriting melodies of who we were supposed to be.\nHold on to the beat before the signal starts to fade,\nThis is the last song that we ever made.\n\n[Verse 2]\nCoffee cups and photographs scattered on the bedroom floor,\nWaiting for a knock that never comes at my front door.\nEvery tick of the wall clock is a second we surrender,\nTo a silent history that we both will remember.\n\n[Bridge]\nLet the amplifiers blow, let the signal burn out bright,\nWe've got one more chorus before we disappear into the night.`,
        
        'Rap': `[Verse 1]\nYeah, check the mic, check the grid, rising from the pavement,\nSpent a decade in the dark, working for the payment.\nNo handouts, no favors, just a notepad and a pen,\nWriting down the stories of the blocks again and again.\nThey want the quick fame, looking for the easy shortcuts,\nBut I'm built from the bedrock, iron will and cold guts.\n\n[Chorus]\nWe running this town, yeah, we hold the crown,\nThrough the storm and the static, we won't back down.\nFrom the bottom to the top, watch the system crash,\nWe the future of the sound, turning digital to cash.\n\n[Verse 2]\nYeah, pixelated dreams, screen glowing in the midnight,\nCode in the keyboard, hacking through the limelight.\nEvery bar is a bullet, every beat is a shield,\nNever folding under pressure, never quitting the field.`,
        
        'Rock': `[Verse 1]\nHeavy distortion screaming through the dusty garage bands,\nBroken guitar strings and blistered palms on our hands.\nWe were screaming rebellion at a world that didn't care,\nWith the scent of cheap gasoline and smoke in the air.\n\n[Chorus]\nRoll the drums, let the thunder shake the stadium wall,\nWe will stand like giants, we are never gonna fall.\nLet the fire burn, let the guitars scream aloud,\nWe are the echoes in the middle of a screaming crowd.\n\n[Verse 2]\nWe sold our souls for a three-minute rock and roll hook,\nReading our fortunes from a torn-up history book.\nNow the lights are shining and the crowd begins to roar,\nWe are stepping out to give them what they came here for.\n\n[Bridge]\nSolo screaming under white-hot lights,\nBringing back the thunder of those wild summer nights!`,
        
        'Lo-Fi': `[Verse 1]\nRaindrops beating softly on the bedroom window pane,\nAnalog vinyl crackle washing out the heavy rain.\nChords drifting slowly through the lazy afternoon,\nWaiting for the sunrise underneath a fading moon.\n\n[Chorus]\nJust hold on to the vibe, let the music take you slow,\nWe've got nowhere to run, we've got nowhere to go.\nJust a loop in the deck and a tape deck in the drawer,\nWe don't need the flashy lights, we don't need nothing more.\n\n[Verse 2]\nPages of my journal flipping slowly in the breeze,\nFinding peace of mind in between the major keys.\nWarm tea on the desk, steam rising in the light,\nWe will keep the music looping all through the night.`,
        
        'Jazz': `[Verse 1]\nMidnight saxophone playing down in the cellar lounge,\nSmoke rings drifting up, looking for a groove to rebound.\nDouble bass walking down a dark and smoky street,\nKeeping up the rhythm to the tapping of my feet.\n\n[Chorus]\nOh, play me those blue notes, let the brass blow low,\nTake me to the places where the cool cats go.\nIt's an offbeat tempo in a syncopated rhyme,\nWe are keeping it swingin' till the end of time.\n\n[Verse 2]\nRain slicked pavements reflecting the club's neon glow,\nTaking it easy, letting the piano chords flow.\nImprovising keys, searching for a harmony,\nFinding the soul inside of a sweet melody.`,
        
        'Hip-Hop': `[Verse 1]\nOld school beats bouncing off the concrete yard,\nLiving in the fast lane, keeping up the heavy guard.\nScratching on the turntables, bass rattling the floor,\nWe don't talk, we just write, then we lock the studio door.\n\n[Chorus]\nKeep the hands high, feel the kick drum hit,\nThis is the real hip-hop, we are never gonna quit.\nTurn the volume to the max, let the sub-bass boom,\nWe are bringing the street heat into the crowded room.\n\n[Verse 2]\nRhyme patterns complex, flow cold as the snow,\nFrom the streets of New York to the shores of Tokyo.\nWe write the urban history, we speak for the street,\nWe are the generation that will never accept defeat.`
    };
    return stanzas[genre] || stanzas['Pop'];
};

const SEED_PASSWORD = "password123";

// Core seeding engine
const seedDB = async () => {
    try {
        console.log("[SEED] Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("[SEED] Connected successfully.");

        // Ask for safety option
        console.log("\n=================================================");
        console.log("          DATABASE SAFETY OPTION CHECK           ");
        console.log("=================================================");
        console.log("Option A: Delete all old demo data and reseed (RECOMMENDED)");
        console.log("Option B: Append new data without deleting existing documents");
        console.log("-------------------------------------------------");

        let action = 'reseed';
        if (process.argv.includes('--reseed')) {
            action = 'reseed';
            console.log("[SEED] CLI flag --reseed detected. Safety option set to RESEED.");
        } else if (process.argv.includes('--append')) {
            action = 'append';
            console.log("[SEED] CLI flag --append detected. Safety option set to APPEND.");
        } else {
            const answer = await askQuestion("Select option (A/B) [Default A - Reseed]: ");
            if (answer.trim().toLowerCase() === 'b') {
                action = 'append';
            }
        }
        rl.close();

        if (action === 'reseed') {
            console.log("[SEED] Option A selected. Cleaning up existing database collections...");
            await User.deleteMany({});
            await Story.deleteMany({});
            await Song.deleteMany({});
            await Follow.deleteMany({});
            await StoryVersion.deleteMany({});
            await Contribution.deleteMany({});
            await Notification.deleteMany({});
            console.log("[SEED] Database cleared successfully.");
        } else {
            console.log("[SEED] Option B selected. Appending new documents to the current database.");
        }

        // Metrics counters
        let usersCreated = 0;
        let storiesCreated = 0;
        let lyricsCreated = 0;
        let commentsCreated = 0;
        let contributionsCreated = 0;
        let followersCreated = 0;
        let likesCreated = 0;
        let viewsGenerated = 0;
        // ─── 1. SEED USERS (50 Users) ──────────────────────────────────────────
        console.log("[SEED] Generating 50 realistic users...");
        const usersData = [];

        for (let i = 0; i < 50; i++) {
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            const username = faker.internet.username({ firstName, lastName }).toLowerCase().replace(/[^a-z0-9_]/g, '');
            const email = faker.internet.email({ firstName, lastName }).toLowerCase();
            
            // Unsplash profile pictures (portraits)
            const profilePhoto = `https://images.unsplash.com/photo-${i % 2 === 0 ? '1494790108377-be9c29b29330' : '1507003211169-0a1dd7228f2d'}?auto=format&fit=crop&w=150&h=150&q=80`;

            usersData.push({
                username,
                email,
                password: SEED_PASSWORD, // Plain text passwords as verified in authRoutes.js
                profileImage: profilePhoto,
                profilePhoto: profilePhoto,
                authorName: `${firstName} ${lastName}`,
                interests: USER_INTERESTS[i % USER_INTERESTS.length],
                bio: `Creative writer specializing in ${USER_INTERESTS[i % USER_INTERESTS.length].split(',')[0]} and collaborative storytelling. Let's build worlds together!`,
                savedStories: [],
                savedSongs: [],
                likedSongs: [],
                uploadedSongs: [],
                followers: [],
                following: [],
                followersCount: 0,
                followingCount: 0,
                totalProfileViews: faker.number.int({ min: 50, max: 2000 }),
                profileViews: faker.number.int({ min: 10, max: 500 })
            });
            usersCreated++;
        }
        
        const usersList = await User.insertMany(usersData);
        console.log(`[SEED] Created ${usersCreated} users successfully.`);

        // ─── 2. SEED FOLLOW RELATIONSHIPS ──────────────────────────────────────
        console.log("[SEED] Generating follow relationships (5-20 follows per user)...");
        const followsToInsert = [];
        const notificationsToInsert = [];

        for (const user of usersList) {
            const followCount = faker.number.int({ min: 5, max: 20 });
            // Shuffle and pick random users
            const shuffledTargets = [...usersList]
                .filter(u => u._id.toString() !== user._id.toString())
                .sort(() => 0.5 - Math.random())
                .slice(0, followCount);

            for (const target of shuffledTargets) {
                // Prevent duplicate follows in memory
                const alreadyFollowing = user.following.some(id => id.toString() === target._id.toString());
                if (!alreadyFollowing) {
                    followsToInsert.push({
                        followerId: user._id,
                        followingId: target._id
                    });
                    followersCreated++;

                    user.following.push(target._id);
                    target.followers.push(user._id);

                    // Optional: Generate some follow notifications
                    if (faker.number.int({ min: 1, max: 10 }) <= 2) {
                        notificationsToInsert.push({
                            recipient: target._id,
                            sender: user._id,
                            type: "follow",
                            message: `${user.username} started following you.`
                        });
                    }
                }
            }
        }

        if (followsToInsert.length > 0) {
            await Follow.insertMany(followsToInsert);
        }
        if (notificationsToInsert.length > 0) {
            await Notification.insertMany(notificationsToInsert);
        }
        console.log(`[SEED] Established follow relationships.`);

        // ─── 3. SEED STORIES (100 Stories) ──────────────────────────────────────
        console.log("[SEED] Generating 100 long-form collaborative stories...");
        const STORY_GENRES = ['Fantasy', 'Sci-Fi', 'Mystery', 'Adventure', 'Thriller', 'Horror', 'Romance', 'Drama', 'Historical', 'Technology'];

        const storiesToInsert = [];

        for (let i = 0; i < 100; i++) {
            const genre = STORY_GENRES[i % STORY_GENRES.length];
            const author = usersList[i % usersList.length];
            
            // Check if this story is trending (first 10 stories get extremely high metrics)
            const isTrending = i < 10;
            const views = isTrending ? faker.number.int({ min: 12000, max: 30000 }) : faker.number.int({ min: 100, max: 4000 });
            const likesCount = isTrending ? faker.number.int({ min: 600, max: 1500 }) : faker.number.int({ min: 10, max: 200 });

            // Randomly select likedBy users
            const likedByUsers = [...usersList]
                .sort(() => 0.5 - Math.random())
                .slice(0, Math.min(likesCount, usersList.length));

            // Randomly select savedBy users
            const savedByCount = Math.floor(likesCount * 0.4);
            const savedByUsers = [...usersList]
                .sort(() => 0.5 - Math.random())
                .slice(0, Math.min(savedByCount, usersList.length));

            // Build structured block content
            const blocks = [
                { id: Date.now() + 1, type: "text", value: `<p>${generateParagraph(genre, 0, `Title-${i}`, author.username)}</p>` },
                { id: Date.now() + 2, type: "text", value: `<p>${generateParagraph(genre, 1, `Title-${i}`, author.username)}</p>` },
                { id: Date.now() + 3, type: "text", value: `<p>${generateParagraph(genre, 2, `Title-${i}`, author.username)}</p>` }
            ];

            // Generated Comments (5-20 per story, or 25-50 for trending)
            const commentCount = isTrending ? faker.number.int({ min: 25, max: 50 }) : faker.number.int({ min: 5, max: 20 });
            const comments = [];
            for (let c = 0; c < commentCount; c++) {
                const commentUser = usersList[faker.number.int({ min: 0, max: usersList.length - 1 })];
                comments.push({
                    username: commentUser.username,
                    text: faker.helpers.arrayElement([
                        "This story had me hooked from the very first paragraph! Can't wait for the next continuation.",
                        "The setting is incredibly detailed. The description of Eldoria is breathtaking.",
                        "Brilliant plot twist in the second block. Who would have guessed the clock was reversing time?",
                        "I submitted a continuation idea for this, hope the author reviews it!",
                        "The pacing is perfect. Excellent prose.",
                        "A very unique perspective on space travel. This salvage captain is a great character.",
                        "Absolutely chilling. The cellar description sent shivers down my spine.",
                        "This is beautifully written. Best romance story on the platform so far.",
                        "Strong historical vibes. Feels like a real published Victorian novel.",
                        "The coding/tech details are actually accurate for once. Love this!"
                    ]),
                    createdAt: faker.date.recent()
                });
                commentsCreated++;
            }

            // Generate Contributions (3-10 per story, or 10-15 for trending)
            const contribCount = isTrending ? faker.number.int({ min: 10, max: 15 }) : faker.number.int({ min: 3, max: 10 });
            const contributions = [];
            const contributorsList = [];

            const storyId = new mongoose.Types.ObjectId();

            for (let k = 0; k < contribCount; k++) {
                // Ensure contributor is not the story author
                const contributor = usersList[(i + k + 1) % usersList.length];
                const isAccepted = k === 0 || (k === 1 && faker.number.int({ min: 1, max: 10 }) <= 4); // accept 1 or 2 contributions
                const status = isAccepted ? 'accepted' : (k === 2 && faker.number.int({ min: 1, max: 10 }) <= 2 ? 'rejected' : 'pending');

                const contribText = faker.helpers.arrayElement([
                    `Continuing the search, Alistair discovered a small golden key hidden inside the hollow teeth of the solar dial. The key carried the crest of the lost archmage.`,
                    `The radar console beeped again. A secondary object was emerging from the warp rift, larger than the ship itself, and it was powered by a biological battery.`,
                    `Harrison picked up the poisoned glass, noticing a faint residue of almond extract. He wrapped it in his handkerchief and slipped it into his chest pocket.`,
                    `A sudden landslide blocked the entrance of the temple, sealing Elena inside with only ten matches and a flask of fresh spring water.`,
                    `Vance pulled the trigger, but the chamber was empty. The hacker had planned this trap, replacing the magazine with hollow dummy rounds.`,
                    `The rocking chair began to move faster. Emily took a step back, but her foot sank into the rotten cellar floor, trapping her ankle in the cold wood.`
                ]) + " " + faker.lorem.sentences(1);

                const upvotes = faker.number.int({ min: 5, max: 150 });
                const upvotedBy = [...usersList]
                    .sort(() => 0.5 - Math.random())
                    .slice(0, Math.min(upvotes, 30))
                    .map(u => u._id);

                const cId = new mongoose.Types.ObjectId();

                contributions.push({
                    _id: cId,
                    author: contributor.username,
                    authorId: contributor._id,
                    text: contribText,
                    upvotes,
                    upvotedBy,
                    accepted: isAccepted,
                    acceptedAt: isAccepted ? faker.date.recent() : null,
                    acceptedBy: isAccepted ? author._id : null,
                    status,
                    createdAt: faker.date.recent()
                });

                contributionsCreated++;

                if (isAccepted) {
                    // Append contribution text directly to story content blocks to simulate actual accept flow
                    blocks.push({
                        id: Date.now() + 10 + k,
                        type: "text",
                        value: `<p>${contribText}</p>`
                    });

                    // Track in contributors credit list
                    contributorsList.push({
                        contributorId: contributor._id,
                        contributorName: contributor.username,
                        profilePhoto: contributor.profilePhoto || contributor.profileImage || "",
                        contributionId: cId,
                        contributedText: contribText,
                        mergedAt: new Date()
                    });
                }
            }

            const titleText = faker.helpers.arrayElement([
                `The Spires of ${faker.location.city()}`,
                `Derelict Voyage of ${faker.vehicle.vrm()}`,
                `The Reversed Watch of ${faker.person.lastName()} Hall`,
                ` Elena and the ${faker.word.adjective()} Disc`,
                `Chasing Key ${faker.string.alphanumeric(6).toUpperCase()}`,
                `Shadows of the ${faker.word.noun()} Cellar`,
                `Clara's ${faker.word.adjective()} Sketchbook`,
                `Julian and the ${faker.word.adjective()} Stage`,
                `Empress Steam Dispatch`,
                `Helen's quantum ${faker.word.noun()} loop`
            ]) + ` (Vol. ${i + 1})`;

            // Construct slug explicitly
            const slug = titleText
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, "")
                .trim()
                .replaceAll(" ", "-") + "-" + Date.now() + "-" + i;

            storiesToInsert.push({
                _id: storyId,
                title: titleText,
                genre,
                summary: `A gripping ${genre.toLowerCase()} story of mystery, collaboration, and high stakes written by @${author.username} and the community.`,
                content: blocks,
                coverImage: getCoverImage(genre, i),
                tags: [genre.toLowerCase(), "collaborative", "fiction", `seed-${i}`],
                authorNote: "This is a seeded demo story to showcase world-building and collaborative continuations.",
                readingTime: Math.max(1, Math.ceil(blocks.length * 1.5)),
                status: (i < 90) ? 'published' : 'draft', // 90 published, 10 drafts
                storyType: (i % 2 === 0) ? 'single' : 'chapter',
                author: author.username,
                authorId: author._id,
                likes: likesCount,
                views,
                likedBy: likedByUsers.map(u => u._id),
                savedBy: savedByUsers.map(u => u._id),
                comments,
                contributions,
                contributors: contributorsList,
                slug
            });

            storiesCreated++;
            viewsGenerated += views;
            likesCreated += likesCount;

            // Sync saved stories back to users in memory
            for (const savedUser of savedByUsers) {
                savedUser.savedStories.push(storyId);
            }
        }

        const createdStories = await Story.insertMany(storiesToInsert);
        console.log(`[SEED] Created ${storiesCreated} stories successfully.`);

        // ─── 4. SEED SONG LYRICS (75 Lyrics) ───────────────────────────────────
        console.log("[SEED] Generating 75 collaborative lyrics songs...");
        const SONG_GENRES_LIST = ['Pop', 'Rap', 'Rock', 'Lo-Fi', 'Jazz', 'Hip-Hop', 'Indie', 'Classical', 'Electronic'];

        const songsToInsert = [];

        for (let i = 0; i < 75; i++) {
            const genre = SONG_GENRES_LIST[i % SONG_GENRES_LIST.length];
            const author = usersList[i % usersList.length];

            const isTrending = i < 10;
            const views = isTrending ? faker.number.int({ min: 10000, max: 25000 }) : faker.number.int({ min: 50, max: 3000 });
            const likesCount = isTrending ? faker.number.int({ min: 500, max: 1200 }) : faker.number.int({ min: 5, max: 150 });

            // Randomly select likedBy users
            const likedByUsers = [...usersList]
                .sort(() => 0.5 - Math.random())
                .slice(0, Math.min(likesCount, usersList.length));

            // Randomly select savedBy users
            const savedByCount = Math.floor(likesCount * 0.4);
            const savedByUsers = [...usersList]
                .sort(() => 0.5 - Math.random())
                .slice(0, Math.min(savedByCount, usersList.length));

            let lyricsContent = generateLyrics(genre);

            // Generated Comments (5-20 per song)
            const commentCount = isTrending ? faker.number.int({ min: 20, max: 45 }) : faker.number.int({ min: 5, max: 15 });
            const comments = [];
            for (let c = 0; c < commentCount; c++) {
                const commentUser = usersList[faker.number.int({ min: 0, max: usersList.length - 1 })];
                comments.push({
                    username: commentUser.username,
                    text: faker.helpers.arrayElement([
                        "Love the rhyming patterns here. Feels very organic.",
                        "I'm humming a synth melody to these lyrics in my head. Nice job!",
                        "The Lo-Fi vibe is real. Submitting some bridge suggestions.",
                        "Excellent wordplay in the second verse.",
                        "Can someone suggest a hook continuation? I'm stuck.",
                        "These rock stanzas carry real high energy.",
                        "Beautiful songwriting. The jazz swing fits perfectly.",
                        "Very deep message. Collaborative writing rules!"
                    ]),
                    createdAt: faker.date.recent()
                });
                commentsCreated++;
            }

            // Generate Contributions (3-10 per song)
            const contribCount = isTrending ? faker.number.int({ min: 8, max: 14 }) : faker.number.int({ min: 3, max: 8 });
            const contributions = [];
            const contributorsList = [];

            const songId = new mongoose.Types.ObjectId();

            for (let k = 0; k < contribCount; k++) {
                const contributor = usersList[(i + k + 2) % usersList.length];
                const isAccepted = k === 0 || (k === 1 && faker.number.int({ min: 1, max: 10 }) <= 3);
                const status = isAccepted ? 'accepted' : (k === 2 && faker.number.int({ min: 1, max: 10 }) <= 2 ? 'rejected' : 'pending');

                const contribText = faker.helpers.arrayElement([
                    `[Alternative Hook]\nAnd we bounce with the tide, nowhere left to hide,\nKeeping the fires lit side by side.`,
                    `[Bridge Additions]\nThrough the static grid, yeah we made a way,\nTurning all our shadows into brighter days.`,
                    `[Verse 3]\nNow the morning breaks on the dusty keys,\nStill humming echoes in the autumn breeze.`,
                    `[Ending stanzas]\nLooped and repeated, we find our release,\nFinally turning our static to peace.`
                ]);

                const upvotes = faker.number.int({ min: 2, max: 80 });
                const upvotedBy = [...usersList]
                    .sort(() => 0.5 - Math.random())
                    .slice(0, Math.min(upvotes, 20))
                    .map(u => u._id);

                const cId = new mongoose.Types.ObjectId();

                contributions.push({
                    _id: cId,
                    author: contributor.username,
                    authorId: contributor._id,
                    text: contribText,
                    upvotes,
                    upvotedBy,
                    accepted: isAccepted,
                    acceptedAt: isAccepted ? faker.date.recent() : null,
                    acceptedBy: isAccepted ? author._id : null,
                    status,
                    createdAt: faker.date.recent()
                });

                contributionsCreated++;

                if (isAccepted) {
                    // Append directly to lyrics text
                    lyricsContent = lyricsContent + "\n\n" + contribText;

                    contributorsList.push({
                        contributorId: contributor._id,
                        contributorName: contributor.username,
                        profilePhoto: contributor.profilePhoto || contributor.profileImage || "",
                        contributionId: cId,
                        contributedText: contribText,
                        mergedAt: new Date()
                    });
                }
            }

            const titleText = faker.helpers.arrayElement([
                `Electric Rain over ${faker.location.city()}`,
                `Grid static loop #${faker.number.int({ min: 10, max: 999 })}`,
                `Summer Garage Echoes`,
                `Vinyl Windowpane Beats`,
                `Syncope Blue Notes`,
                `Pavement concrete rhymes`
            ]);

            const slug = titleText
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, "")
                .trim()
                .replaceAll(" ", "-") + "-" + Date.now() + "-" + i;

            songsToInsert.push({
                _id: songId,
                title: titleText,
                artistName: faker.helpers.arrayElement([
                    "The Electric Echoes",
                    "MC Static",
                    "Garage Band Syndicate",
                    "Clara & The Keys",
                    "Synapse Core",
                    "Uncharted Sound"
                ]),
                genre,
                coverImage: getCoverImage(genre, i),
                lyrics: lyricsContent,
                summary: `Collaborative ${genre.toLowerCase()} lyrics created by @${author.username} and collaborators. Add a verse and co-create!`,
                tags: [genre.toLowerCase(), "lyrics", "collaboration", `track-${i}`],
                author: author.username,
                authorId: author._id,
                likes: likesCount,
                views,
                likedBy: likedByUsers.map(u => u._id),
                savedBy: savedByUsers.map(u => u._id),
                comments,
                contributions,
                contributors: contributorsList,
                status: (i < 70) ? 'published' : 'draft',
                slug
            });

            lyricsCreated++;
            viewsGenerated += views;
            likesCreated += likesCount;

            // Push to author uploaded songs array in memory
            author.uploadedSongs.push(songId);

            // Sync saved songs back to users in memory
            for (const savedUser of savedByUsers) {
                savedUser.savedSongs.push(songId);
            }
            // Sync liked songs back to users in memory
            for (const likedUser of likedByUsers) {
                likedUser.likedSongs.push(songId);
            }
        }

        const createdSongs = await Song.insertMany(songsToInsert);
        console.log(`[SEED] Created ${lyricsCreated} collaborative songs successfully.`);

        // ─── 5. SEED STORY VERSIONS (1-5 versions for 20 stories) ──────────────
        console.log("[SEED] Generating StoryVersions for a subset of stories...");
        const storiesToVersion = createdStories.slice(0, 20);
        let versionsCreated = 0;
        const versionsToInsert = [];

        for (const story of storiesToVersion) {
            const versionCount = faker.number.int({ min: 1, max: 4 });
            for (let v = 1; v <= versionCount; v++) {
                versionsToInsert.push({
                    storyId: story._id,
                    versionNumber: v,
                    oldContent: [
                        { id: Date.now() + 100 + v, type: "text", value: `<p>Old draft paragraph version ${v} of story: ${story.title}</p>` },
                        { id: Date.now() + 101 + v, type: "text", value: `<p>${faker.lorem.paragraphs(2)}</p>` }
                    ]
                });
                versionsCreated++;
            }
        }
        if (versionsToInsert.length > 0) {
            await StoryVersion.insertMany(versionsToInsert);
        }
        console.log(`[SEED] Created ${versionsCreated} story versions successfully.`);

        // ─── 6. SYNC AND UPDATE USER DATA ─────────────────────────────────────
        console.log("[SEED] Syncing and updating user profiles in database...");
        await Promise.all(usersList.map(user => {
            user.followersCount = user.followers.length;
            user.followingCount = user.following.length;
            return user.save();
        }));
        console.log("[SEED] User profiles synced and updated successfully.");

        // Output final seeding summary report
        console.log("\n=================================================");
        console.log("          STORYWEAVE POST-SEED REPORT            ");
        console.log("=================================================");
        console.log(`✔ Users Created:               ${usersCreated}`);
        console.log(`✔ Followers Connections:       ${followersCreated}`);
        console.log(`✔ Stories Generated:           ${storiesCreated}`);
        console.log(`✔ Songs/Lyrics Generated:       ${lyricsCreated}`);
        console.log(`✔ Comments Created:            ${commentsCreated}`);
        console.log(`✔ Contributions Created:       ${contributionsCreated}`);
        console.log(`✔ Story Versions Archived:     ${versionsCreated}`);
        console.log(`✔ Total Likes Distributed:     ${likesCreated}`);
        console.log(`✔ Total Views Simulated:       ${viewsGenerated}`);
        console.log("=================================================");
        console.log("[SEED] Database seeding completed successfully!\n");

    } catch (err) {
        console.error("[SEED] Error seeding the database:", err);
    } finally {
        mongoose.connection.close();
    }
};

// Start execution
seedDB();
