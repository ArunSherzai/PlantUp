export type TutorialFlowId = 'app_onboarding' | 'missions_tutorial' | 'chat_tutorial' | 'profile_tutorial' | 'plant_setup' | 'shop_inventory_tutorial' | 'notifications_tutorial' | 'plant_stats_tutorial' | 'sensor_info_tutorial';

export interface TutorialMessage {
    text: string;
    spriteState?: 'talking' | 'idle' | 'happy' | 'warning';
    placement?: 'top' | 'bottom' | 'center'; // Control where Sprig appears
}

export const TUTORIALS: Record<TutorialFlowId, TutorialMessage[]> = {
    app_onboarding: [
        { text: "Hey Gardeneer! I'm Sprig, your personal AI plant assistant.", spriteState: 'talking' },
        { text: "Welcome to PlantUp! This is the Community Feed where all gardeners share their progress.", spriteState: 'talking' },
        { text: "Take a look around! You can admire other people's plants, drop a like, or leave a helpful comment.", spriteState: 'talking' },
        { text: "Sharing and interacting with the community is a great way to earn extra Plant Coins and XP.", spriteState: 'talking' },
        { text: "When you're ready, try taking a picture of your own plant and posting it using the '+' button below!", spriteState: 'happy' }
    ],
    missions_tutorial: [
        { text: "Welcome to your Missions Hub!", spriteState: 'talking' },
        { text: "Here you can complete Daily and Weekly quests to earn massive amounts of XP.", spriteState: 'talking' },
        { text: "See the Streak at the top? Completing all daily quests increases your streak, which multiplies your XP gains!", spriteState: 'talking' },
        { text: "If you miss a day, your streak will break, so rely on Streak Freezes from the shop to protect it.", spriteState: 'warning' },
        { text: "Get farming and grab those rewards!", spriteState: 'happy' }
    ],
    chat_tutorial: [
        { text: "This is your Direct Messages inbox.", spriteState: 'talking' },
        { text: "Here you can chat privately with other gardeners, share tips, and make new plant-loving friends.", spriteState: 'talking' },
        { text: "Stay friendly and help each other out!", spriteState: 'happy' }
    ],
    profile_tutorial: [
        { text: "Welcome to your Profile Space!", spriteState: 'talking' },
        { text: "At the top right is the Settings gear, where you can modify the app or replay these tutorials.", spriteState: 'talking' },
        { text: "Here you can see your core stats, like your Plant Coins, and your Followers and Following counts.", spriteState: 'talking' },
        { text: "Tap the pen or t-shirt icon on your Card to equip Titles and Borders!", spriteState: 'talking' },
        { text: "As you earn XP, your 3D rank plant will grow, and you'll unlock new Level Rewards below it.", spriteState: 'talking' },
        { text: "Lastly, use the tabs at the bottom to view your past Posts or the ones you've liked.", spriteState: 'happy' }
    ],
    shop_inventory_tutorial: [
        { text: "Welcome to the Shop and Inventory!", spriteState: 'talking' },
        { text: "In the Shop, you can spend Plant Coins—earned by completing quests and gaining XP—on Lootboxes and Streak Freezes.", spriteState: 'talking' },
        { text: "Switch to the Inventory tab to open your Lootboxes to get random Titles and Borders.", spriteState: 'talking' },
        { text: "You can also activate XP Boosters from your Inventory to multiply your rewards for 24 hours!", spriteState: 'happy' }
    ],
    plant_stats_tutorial: [
        { text: "Welcome to your Plant Details! Here you can monitor everything about your plant.", spriteState: 'talking' },
        { text: "At the top, you'll see the Health Score, which I calculate based on your sensor data like soil moisture and light.", spriteState: 'talking' },
        { text: "Below that are the Snapshot Boxes showing the exact current readings from your connected sensor.", spriteState: 'talking' },
        { text: "Scroll down to see the Trend Chart and Mini-Trends. These show your plant's historical data so you can spot patterns.", spriteState: 'talking' },
        { text: "You can change the time range using the picker, or view calculated averages in the History section at the very bottom!", spriteState: 'happy' }
    ],
    sensor_info_tutorial: [
        { text: "Soil Moisture tells you how thirsty your plant is. Keep it between 40% and 60% to prevent root rot or dehydration!", spriteState: 'talking' },
        { text: "Temperature affects growth. Most indoor plants prefer a cozy 18°C to 24°C.", spriteState: 'talking' },
        { text: "Light is plant food! Most plants thrive between 3,000 and 10,000 Lux depending on their species.", spriteState: 'talking' },
        { text: "EC measures the nutrients in the soil. Try to keep it between 1.0 and 2.0 mS/cm for healthy feeding.", spriteState: 'talking' }
    ],
    notifications_tutorial: [
        { text: "These are your Notification settings.", spriteState: 'talking' },
        { text: "If you keep 'Sprig Notifications' enabled, I'll pop up occasionally to give you helpful tips, remind you of your streak, and guide you!", spriteState: 'talking' },
        { text: "You can turn me off at any time if you prefer a quieter experience.", spriteState: 'happy' }
    ],
    plant_setup: [
        { text: "Let's connect your first smart sensor!", spriteState: 'talking' },
        { text: "Make sure your sensor is turned on and blinking blue.", spriteState: 'talking' },
        { text: "Excellent! Now I can monitor your plant's health and notify you if it needs water.", spriteState: 'happy' }
    ]
};
