import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const TestScreen = () => {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={{ fontSize: 20, marginBottom: 20 }}>Top Content</Text>
            {/* Add enough height to force scrolling if needed, or just keep as is to test positioning */}
            <View style={{ height: 1000, backgroundColor: 'lightgrey', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <Text>Spacer to force scroll</Text>
            </View>
            <View style={{ height: 100, width: '100%', backgroundColor: 'red', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Bottom Red Box</Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
});

export default TestScreen;
