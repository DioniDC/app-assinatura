import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import AssinadosScreen from '../screens/AssinadosScreen';
import ComprasScreen from '../screens/ComprasScreen';
import AssinaturaScreen from '../screens/AssinaturaScreen'; 
import StartScreen from '../screens/StartScreen';

export type RootStackParamList = {
  Start: undefined;
  Home: undefined;
  Assinatura: { pdfUrl: string; venda: any; nomeArquivo: string; };
  Compras: undefined;
  Assinados: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function StackNavigator() {
  return (
  <Stack.Navigator initialRouteName="Start">
    <Stack.Screen
      name="Start"
      component={StartScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Assinatura de Vendas' }} />
    <Stack.Screen name="Assinatura" component={AssinaturaScreen} options={{ title: 'Assinar PDF' }} />
    <Stack.Screen name="Compras" component={ComprasScreen} options={{ title: 'Buscar Vendas' }} />
    <Stack.Screen name="Assinados" component={AssinadosScreen} options={{ title: 'Vendas Assinadas' }} />
  </Stack.Navigator>
  );
}
