import { Object3DNode } from '@react-three/fiber';
import { Camera, Group, Mesh, CylinderGeometry, MeshStandardMaterial, AmbientLight, DirectionalLight, InstancedMesh } from 'three';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            group: Object3DNode<Group, typeof Group>;
            mesh: Object3DNode<Mesh, typeof Mesh>;
            cylinderGeometry: Object3DNode<CylinderGeometry, typeof CylinderGeometry>;
            meshStandardMaterial: Object3DNode<MeshStandardMaterial, typeof MeshStandardMaterial>;
            ambientLight: Object3DNode<AmbientLight, typeof AmbientLight>;
            directionalLight: Object3DNode<DirectionalLight, typeof DirectionalLight>;
            instancedMesh: Object3DNode<InstancedMesh, typeof InstancedMesh>;
            primitive: any; // primitive is a special R3F element
            instance: any; // instance is a special R3F element
            // Add more as needed
        }
    }
}
