#version 140
#define EPSILON  0.001
#define BIG  1000000.0

const int spheresVal=3;

const int DIFFUSE = 1;

out vec4 FragColor;
in vec3 glPosition;

const int DIFFUSE_REFLECTION = 1;
const int MIRROR_REFLECTION = 2;
const int REFRACTION = 3;

struct SSphere
{
	 vec3 Center;
	 float Radius;
	 int Materialidx;
};
struct STriangle
{
	vec3 v1;
	vec3 v2;
	vec3 v3;
	int Materialidx;
};
struct SLight
{
	vec3 Position;
	vec3 Color;
};

/*** DATA STRUCTURES ***/
struct SCamera
{
	vec3 Position;
	vec3 View;
	vec3 Up;
	vec3 Side;
	vec2 Scale;
};
struct SRay
{
	vec3 Origin;
	vec3 Direction;
};
struct SIntersection
{
	float Time;
	vec3 Point;
	vec3 Normal;
	vec3 Color;

	vec4 LightCoeffs;

	float ReflectionCoef;
	float RefractionCoef;
	int MaterialType;
};
struct SMaterial
{
	vec3 Color;
	vec4 LightCoeffs;
	float ReflectionCoef;
	float RefractionCoef;
	int MaterialType;
};

struct STracingRay 
{ 
	SRay ray;
	float contribution;
	int depth;
};

const int STACK_SIZE = 20;
STracingRay[STACK_SIZE] array;
int size = 0;

STracingRay popRay() 
{
	size = size - 1;
    return array[size];
}

void pushRay(STracingRay ray) 
{
    array[size] = ray;
	size = size + 1;
}

bool isEmpty() 
{
    return size < 1;
}


void initializeDefaultScene( out STriangle triangles[12],  out SSphere spheres[spheresVal])
{
	/** TRIANGLES **/
	
	/* left wall */
	triangles[0].v1 = vec3(-5.0,-5.0,-5.0);
	triangles[0].v2 = vec3(-5.0, 5.0, 5.0);
	triangles[0].v3 = vec3(-5.0, 5.0,-5.0);
	triangles[0].Materialidx = 0;
	triangles[1].v1 = vec3(-5.0,-5.0,-5.0);
	triangles[1].v2 = vec3(-5.0,-5.0, 5.0);
	triangles[1].v3 = vec3(-5.0, 5.0, 5.0);
	triangles[1].Materialidx = 0;
	
	/* back wall */
	triangles[2].v1 = vec3(-5.0,-5.0, 5.0);
	triangles[2].v2 = vec3( 5.0,-5.0, 5.0);
	triangles[2].v3 = vec3(-5.0, 5.0, 5.0);
	triangles[2].Materialidx = 3;
	triangles[3].v1 = vec3( 5.0, 5.0, 5.0);
	triangles[3].v2 = vec3(-5.0, 5.0, 5.0);
	triangles[3].v3 = vec3( 5.0,-5.0, 5.0);
	triangles[3].Materialidx = 3;
	
	/*right wall */
	triangles[4].v1 = vec3(5.0, 5.0, 5.0);
	triangles[4].v2 = vec3(5.0, -5.0, 5.0);
	triangles[4].v3 = vec3(5.0, 5.0, -5.0);			
	triangles[4].Materialidx = 2;
	triangles[5].v1 = vec3(5.0, 5.0, -5.0);
	triangles[5].v2 = vec3(5.0, -5.0, 5.0);
	triangles[5].v3 = vec3(5.0, -5.0, -5.0);				
	triangles[5].Materialidx = 2;
	
	/*down wall */
	triangles[6].v1 = vec3(-5.0,-5.0, 5.0);
	triangles[6].v2 = vec3(-5.0,-5.0,-5.0);
	triangles[6].v3 = vec3( 5.0,-5.0, 5.0);
	triangles[6].Materialidx = 3;
	triangles[7].v1 = vec3(5.0, -5.0, -5.0);
	triangles[7].v2 = vec3(5.0,-5.0, 5.0);
	triangles[7].v3 = vec3(-5.0,-5.0,-5.0);
	triangles[7].Materialidx = 3;
	
	/*up wall */
	triangles[8].v1 = vec3(-5.0, 5.0,-5.0);
	triangles[8].v2 = vec3(-5.0, 5.0, 5.0);
	triangles[8].v3 = vec3( 5.0, 5.0, 5.0);
	triangles[8].Materialidx = 4;
	triangles[9].v1 = vec3(-5.0, 5.0, -5.0);
	triangles[9].v2 = vec3( 5.0, 5.0, 5.0);
	triangles[9].v3 = vec3(5.0, 5.0, -5.0);
	triangles[9].Materialidx = 4;

	/*front wall*/
	triangles[10].v1 = vec3(-5.0,-5.0, -5.0);
	triangles[10].v2 = vec3( 5.0,-5.0, -5.0);
	triangles[10].v3 = vec3(-5.0, 5.0, -5.0);
	triangles[10].Materialidx = 1;
	triangles[11].v1 = vec3( 5.0, 5.0, -5.0);
	triangles[11].v2 = vec3(-5.0, 5.0, -5.0);
	triangles[11].v3 = vec3( 5.0,-5.0, -5.0);
	triangles[11].Materialidx = 1;
	
	/** SPHERES **/
	spheres[0].Center = vec3(-1.0,-2.0,-1.0);
	spheres[0].Radius =  0.5; 
	spheres[0].Materialidx = 0;
	spheres[1].Center = vec3(2.0,1.0,-2.0);
	spheres[1].Radius = 1; 
	spheres[1].Materialidx = 0;
	spheres[2].Center = vec3(-2.0,-2.0, 2.0);
	spheres[2].Radius = 0.5; 
	spheres[2].Materialidx = 0;
	int kost;
}

SRay GenerateRay ( SCamera uCamera )
{
	vec2 coords = glPosition.xy * uCamera.Scale;
	vec3 direction = uCamera.View + uCamera.Side * coords.x + uCamera.Up * coords.y;
	return SRay ( uCamera.Position, normalize(direction) );
}

SCamera initializeDefaultCamera()
{
 //** CAMERA **//
	float v1=0;
	float v2=0;
	float v3=-4;

	float v1_v=0;
	float v2_v=0;
	float v3_v=1;

	SCamera camera;
	camera.Position = vec3(v1, v2, v3);
	camera.View = vec3(v1_v, v2_v, v3_v);
	camera.Up = vec3(0.0, 1.0, 0.0);
	camera.Side = vec3(1.0, 0.0, 0.0);
	camera.Scale = vec2(1.0, 1.0);
	return camera;
}

/*Intersection */
bool IntersectSphere ( SSphere sphere, SRay ray, float start, float final, out float time )
{
	ray.Origin -= sphere.Center;
	float A = dot ( ray.Direction, ray.Direction );
	float B = dot ( ray.Direction, ray.Origin );
	float C = dot ( ray.Origin, ray.Origin ) - sphere.Radius * sphere.Radius;
	float D = B * B - A * C;
	if ( D > 0 )
	{
		D = sqrt(D);
		float t1 = ( -B - D ) / A;
		float t2 = ( -B + D ) / A;
		if((t1 < 0) && (t2 < 0))
			return false;
		if(min(t1, t2) < 0)
		{
			time = max(t1,t2);
			return true;
		}
		time = min(t1, t2);
		return true;
	}
	return false;
}
bool IntersectTriangle (SRay ray, vec3 v1, vec3 v2, vec3 v3, out float time )
{
	time = -1.0;
	vec3 A = v2 - v1;
	vec3 B = v3 - v1;
	vec3 N = cross(A, B);
	float NdotRayDirection = dot(N, ray.Direction);
	if (abs(NdotRayDirection) < 0.001)
		return false;
	float d = dot(N, v1);

	float t = -(dot(N, ray.Origin) - d) / NdotRayDirection;

	if (t < 0)
		return false;

	vec3 P = ray.Origin + t * ray.Direction;

	vec3 C;

	vec3 edge1 = v2 - v1;
	vec3 VP1 = P - v1;
	C = cross(edge1, VP1);
	if (dot(N, C) < 0)
		return false;

	vec3 edge2 = v3 - v2;
	vec3 VP2 = P - v2;
	C = cross(edge2, VP2);
	if (dot(N, C) < 0)
		return false;

	vec3 edge3 = v1 - v3;
	vec3 VP3 = P - v3;
	C = cross(edge3, VP3);
	if (dot(N, C) < 0)
		return false;

	time = t;
	return true;

}

bool Raytrace ( SRay ray, SSphere spheres[spheresVal], STriangle triangles[12], SMaterial materials[6], float start, float final, inout SIntersection intersect )
{
	bool result = false;
	float test = start;
	intersect.Time = final;
	for(int i = 0; i < spheresVal; i++)
	{
		SSphere sphere = spheres[i];
		bool tmp = IntersectSphere(sphere, ray, start, final, test);
		if( (tmp) && (test < intersect.Time) )
		{
			intersect.Time = test;
			intersect.Point = ray.Origin + ray.Direction * test;
			intersect.Normal = normalize ( intersect.Point - spheres[i].Center );
			intersect.Color = vec3(1, 1, 1);
			intersect.LightCoeffs = vec4(0.75, 0.75, 0.75, 2);
			intersect.ReflectionCoef = 1.05;
			intersect.RefractionCoef = 1;
			intersect.MaterialType = MIRROR_REFLECTION;
			result = true;
		}
	}
	for(int i = 0; i < 12; i++)
	{
		STriangle triangle = triangles[i];
		if((IntersectTriangle(ray, triangle.v1, triangle.v2, triangle.v3, test)) && (test < intersect.Time))
		{ 
			intersect.Time = test;
			intersect.Point = ray.Origin + ray.Direction * test;
			intersect.Normal = normalize(cross(triangle.v1 - triangle.v2, triangle.v3 - triangle.v2));
			intersect.Color = materials[triangle.Materialidx].Color;
			intersect.LightCoeffs = vec4(0.9, 0.9, 0.9 , 512.0);
			intersect.ReflectionCoef = 1.5;
			intersect.RefractionCoef = 1.0;
			intersect.MaterialType = DIFFUSE_REFLECTION;
			result = true;
		}
	}
	
	return result;
}

/*Light*/
void initializeDefaultLightMaterials(out SLight light, out SMaterial materials[6])
{
	//** LIGHT **//
	light.Position = vec3(-2.0, 2.0, -2.0);
	/** MATERIALS **/
	vec4 lightCoefs = vec4(0.4,0.9,0.0,512.0);
	materials[0].Color = vec3(1.0, 0, 0);
	materials[0].LightCoeffs = vec4(lightCoefs);
	materials[0].ReflectionCoef = 0.5;
	materials[0].RefractionCoef = 1.0;
	materials[0].MaterialType = DIFFUSE;
	
	materials[1].Color = vec3(0, 0, 1.0);
	materials[1].LightCoeffs = vec4(lightCoefs);
	materials[1].ReflectionCoef = 0.5;
	materials[1].RefractionCoef = 1.0;
	materials[1].MaterialType = MIRROR_REFLECTION;;
	
	materials[2].Color = vec3(0, 2.0, 0);
	materials[2].LightCoeffs = vec4(lightCoefs);
	materials[2].ReflectionCoef = 0.5;
	materials[2].RefractionCoef = 1.0;
	materials[2].MaterialType = MIRROR_REFLECTION;
	
	materials[3].Color = vec3(1.0, 1.0, 1.0);
	materials[3].LightCoeffs = vec4(lightCoefs);
	materials[3].ReflectionCoef = 0.5;
	materials[3].RefractionCoef = 1.0;
	materials[3].MaterialType = MIRROR_REFLECTION;
	
	materials[4].Color = vec3(1.0, 1.0, 1.0);
	materials[4].LightCoeffs = vec4(lightCoefs);
	materials[4].ReflectionCoef = 0.5;
	materials[4].RefractionCoef = 1.0;
	materials[4].MaterialType = DIFFUSE_REFLECTION;
	
	materials[5].Color = vec3(0, 1.0, 1.0);
	materials[5].LightCoeffs = vec4(lightCoefs);
	materials[5].ReflectionCoef = 0.5;
	materials[5].RefractionCoef = 1.0;
	materials[5].MaterialType = DIFFUSE_REFLECTION;	

}
vec3 Phong ( SCamera uCamera, SIntersection intersect, SLight currLight, float shadowing)
{
	vec3 light = normalize ( currLight.Position - intersect.Point );
	float diffuse = max(dot(light, intersect.Normal), 0.0);
	vec3 view = normalize(uCamera.Position - intersect.Point);
	vec3 reflected = reflect( -view, intersect.Normal );
	float specular = pow(max(dot(reflected, light), 0.0), intersect.LightCoeffs.w);
	int Unit = 0; 
	return intersect.LightCoeffs.x * intersect.Color + intersect.LightCoeffs.y * diffuse * intersect.Color * shadowing  + intersect.LightCoeffs.z * specular * Unit;
}
float Shadow(SLight currLight, SIntersection intersect, SSphere spheres[spheresVal], STriangle triangles[12], SMaterial materials[6])
{
	float shadowing = 1.0;
	vec3 direction = normalize(currLight.Position - intersect.Point);
	float distanceLight = distance(currLight.Position, intersect.Point);
	SRay shadowRay = SRay(intersect.Point + direction * EPSILON, direction);
	SIntersection shadowIntersect;
	shadowIntersect.Time = BIG;
	if(Raytrace(shadowRay, spheres, triangles, materials, 0.0, distanceLight, shadowIntersect))
	{
		shadowing = 0.0;
	}
	return shadowing;
}
int raytraceDepth = 10;
void main ( void )
{
	float start = 0;
	float final = BIG;
	SSphere spheres[spheresVal];
	STriangle triangles[12];
	SLight uLight;
	uLight.Color=vec3(0,0,1);

	SMaterial materials[6];
	SCamera uCamera = initializeDefaultCamera();
	SRay ray = GenerateRay(uCamera);
	vec3 resultColor = vec3(0,0,0);
	initializeDefaultScene(triangles, spheres);
	initializeDefaultLightMaterials(uLight, materials);
	
	float contribution = 0.5;
	SIntersection intersect;

	
	for (int i = 0; i < raytraceDepth; i++)
    {	
		intersect.Time = BIG;
		start = 0;
		final = BIG;      
		
		if (Raytrace(ray, spheres, triangles, materials, start, final, intersect)== true)
        {
			switch(intersect.MaterialType) 
			{ 
				case DIFFUSE_REFLECTION: 
				{ 
					float shadowing = Shadow(uLight, intersect, spheres, triangles, materials);
					resultColor += contribution * Phong (uCamera, intersect, uLight, shadowing);
					i = raytraceDepth - 1;
					break;
				}
				case MIRROR_REFLECTION: 
				{ 
					if(intersect.ReflectionCoef < 1)
					{
						contribution *= (1 - intersect.ReflectionCoef);
						float shadowing = Shadow(uLight, intersect, spheres, triangles, materials);
						resultColor += contribution * Phong(uCamera, intersect, uLight, shadowing );
					} 
					vec3 reflectDirection = reflect(ray.Direction, intersect.Normal);
					contribution *= intersect.ReflectionCoef;
					ray = SRay(intersect.Point + reflectDirection * EPSILON, reflectDirection);
					break;
				}
			}
		}
	}
	resultColor+=vec3(0,0,0);
	FragColor = vec4 (resultColor, 1.0);
}